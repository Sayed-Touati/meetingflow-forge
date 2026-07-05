import api, { route } from "@forge/api";

const MEETING_NOTES_TEMPLATE_ID =
  "com.atlassian.confluence.plugins.confluence-business-blueprints:meeting-notes-blueprint";

const TEMPLATE_PLACEHOLDER_TEXT = [
  "List goals for this meeting (e.g., Set design priorities for FY27)",
  "Type /whiteboard to create an interactive canvas for icebreakers, brainstorms, diagramming, retros, and more",
  "Time Topic Presenter Notes",
  "@ mention teammate",
  "Add notes for each discussion topic",
  "Type /decision to record the decisions you make in this meeting:",
  "Type /database to create a database of related information, meetings, or assets",
];

function removeTemplatePlaceholders(text) {
  return TEMPLATE_PLACEHOLDER_TEXT.reduce(
    (cleanedText, placeholder) => cleanedText.replaceAll(placeholder, " "),
    text,
  )
    .replace(/\s+/g, " ")
    .trim();
}

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

  const storageValue = page.body?.storage?.value ?? "";

  const meetingDate = storageValue.match(/<time[^>]*datetime="([^"]+)"/)?.[1];

  console.log("Extracted meeting date:", meetingDate);

  const sectionHeadings = [
    ...storageValue.matchAll(/<h2[^>]*>(.*?)<\/h2>/g),
  ].map((match) =>
    match[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim(),
  );

  console.log("Meeting note section headings:", sectionHeadings);

  const sectionMatches = [
    ...storageValue.matchAll(/<h2[^>]*>(.*?)<\/h2>(.*?)(?=<h2[^>]*>|$)/gs),
  ];

  const sectionsByHeading = Object.fromEntries(
    sectionMatches.map((match) => {
      const heading = match[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim();

      const contentPreview = removeTemplatePlaceholders(
        match[2]
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
      ).slice(0, 300);

      return [heading, contentPreview];
    }),
  );

  const extractedMeetingData = {
    title: page.title,
    date: meetingDate,
    sections: sectionsByHeading,
  };

  console.log("Extracted meeting data:", extractedMeetingData);

  console.log("Meeting note sections preview:", sectionsByHeading);

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
