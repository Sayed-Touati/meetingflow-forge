import api, { route } from "@forge/api";
import { kvs } from "@forge/kvs";
import { parseMeetingNotePage } from "./meeting-parser.mjs";
import { saveMeetingNoteRecord } from "./meeting-storage.mjs";

const MEETING_NOTES_TEMPLATE_ID =
  "com.atlassian.confluence.plugins.confluence-business-blueprints:meeting-notes-blueprint";

export async function handlePageEvent(event, context) {
  console.log("MeetingFlow received a Confluence page update event.");

  const pageId = event.content?.id;

  if (!pageId) {
    console.log("No page ID found in the event!");
    return;
  }

  const pageResponse = await api
    .asApp()
    .requestConfluence(route`/wiki/api/v2/pages/${pageId}?body-format=storage`);

  if (!pageResponse.ok) {
    console.log("Failed to fetch page details from Confluence", {
      pageId,
      status: pageResponse.status,
      statusText: pageResponse.statusText,
    });
    return;
  }

  const page = await pageResponse.json();

  const isMeetingNotesPage =
    page.sourceTemplateEntityId === MEETING_NOTES_TEMPLATE_ID;

  console.log("Meeting notes template detected:", isMeetingNotesPage);

  if (!isMeetingNotesPage) {
    console.log("This page is not a Confluence Meeting Notes page. Skipping.");
    return;
  }

  console.log("Fetched page fields:", Object.keys(page));

  console.log("Fetched page template/body info:", {
    sourceTemplateEntityId: page.sourceTemplateEntityId,
    bodyKeys: page.body ? Object.keys(page.body) : [],
    linkKeys: page._links ? Object.keys(page._links) : [],
  });

  console.log("Fetched page body preview:", {
    storageRepresentation: page.body?.storage?.representation,
    storageValuePreview: page.body?.storage?.value?.slice(0, 500),
  });

  const extractedMeetingData = parseMeetingNotePage(page);

  console.log("Extracted meeting data:", extractedMeetingData);
  console.log("Meeting note section headings:", Object.keys(extractedMeetingData.sections));
  console.log("Extracted meeting date:", extractedMeetingData.date);

  await saveMeetingNoteRecord(kvs, extractedMeetingData);

  console.log("Saved meeting data to Forge storage.");

  console.log("Meeting note sections preview:", extractedMeetingData.sections);

  console.log("Page update summary:", {
    eventType: event.eventType,
    updateTrigger: event.updateTrigger,
    pageId: event.content?.id,
    pageTitle: event.content?.title,
    spaceKey: event.content?.space?.key,
    versionNumber: event.content?.version?.number,
    cloudId: context.installation?.contexts?.[0]?.cloudId,
  });
}
