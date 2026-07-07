import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";
import { kvs } from "@forge/kvs";
import { syncMeetingNotesFromConfluence } from "../meeting-note-sync.mjs";
import { updateConfluenceMeetingNotePage } from "../meeting-confluence-update.mjs";
import {
  getMeetingNoteRecord,
  listMeetingNotesForDate,
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

export const handler = resolver.getDefinitions();
