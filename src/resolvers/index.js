import Resolver from "@forge/resolver";
import { kvs } from "@forge/kvs";

const resolver = new Resolver();

resolver.define("getLatestMeetingData", async () => {
  const latestMeetingData = await kvs.get("latest-meeting-data");

  return latestMeetingData ?? null;
});

resolver.define("saveLatestMeetingData", async (req) => {
  const meetingData = req.payload?.meetingData;

  if (!meetingData) {
    return {
      success: false,
      message: "No meeting data provided.",
    };
  }

  await kvs.set("latest-meeting-data", meetingData);

  return {
    success: true,
    message: "Meeting data saved.",
  };
});

export const handler = resolver.getDefinitions();
