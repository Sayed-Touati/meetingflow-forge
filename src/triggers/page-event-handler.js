import api, { route } from "@forge/api";
import { kvs } from "@forge/kvs";
import {
  createGoogleCalendarAutomationStatus,
  getAutomationSettings,
} from "../features/automation/automation-settings.mjs";
import { MEETING_NOTES_TEMPLATE_ID } from "../features/meeting-notes/constants.mjs";
import { parseMeetingNotePage } from "../features/meeting-notes/meeting-parser.mjs";
import { saveMeetingNoteRecord } from "../features/meeting-notes/meeting-storage.mjs";
import { resolveParticipantDisplayNames } from "../features/meeting-notes/participant-resolver.mjs";

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

  const extractedMeetingData = await resolveParticipantDisplayNames(
    parseMeetingNotePage(page),
    {
      fetchUser: (accountId) =>
        api
          .asApp()
          .requestConfluence(route`/wiki/rest/api/user?accountId=${accountId}`),
    },
  );
  const automationSettings = await getAutomationSettings(kvs);
  const googleCalendarAutomationStatus = createGoogleCalendarAutomationStatus(
    extractedMeetingData,
    automationSettings,
  );
  const meetingDataWithAutomation = {
    ...extractedMeetingData,
    automation: {
      googleCalendar: googleCalendarAutomationStatus,
    },
  };

  console.log("Extracted meeting data:", meetingDataWithAutomation);
  console.log("Meeting note section headings:", Object.keys(meetingDataWithAutomation.sections));
  console.log("Extracted meeting date:", meetingDataWithAutomation.date);
  console.log("Google Calendar automation status:", googleCalendarAutomationStatus);

  await saveMeetingNoteRecord(kvs, meetingDataWithAutomation);

  console.log("Saved meeting data to Forge storage.");

  console.log("Meeting note sections preview:", meetingDataWithAutomation.sections);

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
