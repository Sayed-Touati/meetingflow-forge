import Resolver from "@forge/resolver";
import { kvs } from "@forge/kvs";
import {
  getMeetingNoteRecord,
  LATEST_MEETING_KEY,
  listMeetingNotesForDate,
  saveMeetingNoteRecord,
} from "../meeting-storage.mjs";

const resolver = new Resolver();

resolver.define("getLatestMeetingData", async () => {
  const latestMeetingData = await kvs.get(LATEST_MEETING_KEY);

  return latestMeetingData ?? null;
});

resolver.define("listMeetingNotesForDate", async (req) => {
  return listMeetingNotesForDate(kvs, req.payload?.date);
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
