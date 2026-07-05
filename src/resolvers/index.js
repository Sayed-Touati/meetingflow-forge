import Resolver from "@forge/resolver";
import { kvs } from "@forge/kvs";

const resolver = new Resolver();

resolver.define("getLatestMeetingData", async () => {
  const latestMeetingData = await kvs.get("latest-meeting-data");

  return latestMeetingData ?? null;
});

export const handler = resolver.getDefinitions();
