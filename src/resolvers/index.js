import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";
import { kvs } from "@forge/kvs";
import { syncMeetingNotesFromConfluence } from "../meeting-note-sync.mjs";
import { updateConfluenceMeetingNotePage } from "../meeting-confluence-update.mjs";
import {
  archiveConfluenceMeetingNotePage,
  deleteConfluenceMeetingNotePage,
} from "../meeting-confluence-removal.mjs";
import {
  getMeetingNoteRecord,
  listMeetingNotesForDate,
  removeMeetingNoteRecord,
  saveMeetingNoteRecord,
} from "../meeting-storage.mjs";

const resolver = new Resolver();

resolver.define("listMeetingNotesForDate", async (req) => {
  const date = req.payload?.date;

  await syncMeetingNotesFromConfluence({
    date,
    fetchPage: (pageId) =>
      api
        .asUser()
        .requestConfluence(route`/wiki/api/v2/pages/${pageId}?body-format=storage`),
    kvsClient: kvs,
    fetchUser: (accountId) =>
      api
        .asUser()
        .requestConfluence(route`/wiki/rest/api/user?accountId=${accountId}`),
    searchPages: ({ cql, limit }) =>
      api
        .asUser()
        .requestConfluence(route`/wiki/rest/api/search?cql=${cql}&limit=${limit}`),
  });

  return listMeetingNotesForDate(kvs, date);
});

resolver.define("getMeetingNote", async (req) => {
  return getMeetingNoteRecord(kvs, req.payload?.pageId);
});

resolver.define("saveLatestMeetingData", async (req) => {
  const meetingData = req.payload?.meetingData;

  if (!meetingData) {
    return {
      success: false,
      message: "No meeting data provided.",
    };
  }

  const savedMeetingData = meetingData.pageId
    ? await updateConfluenceMeetingNotePage({
        meetingData,
        fetchPage: (pageId) =>
          api
            .asUser()
            .requestConfluence(route`/wiki/api/v2/pages/${pageId}?body-format=storage`),
        updatePage: (pageId, body) =>
          api.asUser().requestConfluence(route`/wiki/api/v2/pages/${pageId}`, {
            method: "PUT",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }),
      })
    : meetingData;

  await saveMeetingNoteRecord(kvs, savedMeetingData);

  return {
    success: true,
    meetingData: savedMeetingData,
    message: "Meeting data saved.",
  };
});

function getMeetingDataPayload(req) {
  const meetingData = req.payload?.meetingData;

  if (!meetingData?.pageId) {
    throw new Error("No meeting page provided.");
  }

  return meetingData;
}

resolver.define("archiveMeetingNote", async (req) => {
  const meetingData = getMeetingDataPayload(req);

  await archiveConfluenceMeetingNotePage({
    pageId: meetingData.pageId,
    archivePages: (body) =>
      api.asUser().requestConfluence(route`/wiki/rest/api/content/archive`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }),
  });
  await removeMeetingNoteRecord(kvs, meetingData);

  return {
    success: true,
    pageId: meetingData.pageId,
    message: "Meeting note archived.",
  };
});

resolver.define("deleteMeetingNote", async (req) => {
  const meetingData = getMeetingDataPayload(req);

  await deleteConfluenceMeetingNotePage({
    pageId: meetingData.pageId,
    deletePage: (pageId) =>
      api
        .asUser()
        .requestConfluence(route`/wiki/api/v2/pages/${pageId}`, {
          method: "DELETE",
        }),
  });
  await removeMeetingNoteRecord(kvs, meetingData);

  return {
    success: true,
    pageId: meetingData.pageId,
    message: "Meeting note deleted.",
  };
});

export const handler = resolver.getDefinitions();
