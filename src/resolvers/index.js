import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";
import { kvs } from "@forge/kvs";
import { syncMeetingNotesFromConfluence } from "../meeting-note-sync.mjs";
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

  await saveMeetingNoteRecord(kvs, meetingData);

  return {
    success: true,
    message: "Meeting data saved.",
  };
});

export const handler = resolver.getDefinitions();
