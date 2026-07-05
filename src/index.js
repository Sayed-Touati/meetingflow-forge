import api, { route } from "@forge/api";

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

      const contentPreview = match[2]
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 300);

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
