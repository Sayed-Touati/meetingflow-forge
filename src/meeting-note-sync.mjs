import { parseMeetingNotePage } from "./meeting-parser.mjs";
import { saveMeetingNoteRecord } from "./meeting-storage.mjs";
import { MEETING_NOTES_TEMPLATE_ID } from "./meeting-notes-template.mjs";

const SEARCH_LIMIT = 50;

const SEARCH_CQL = "type=page order by lastmodified desc";

async function readJsonResponse(response, description) {
  if (!response.ok) {
    console.log(`MeetingFlow failed to ${description}.`, {
      status: response.status,
      statusText: response.statusText,
    });

    return null;
  }

  return response.json();
}

function isMeetingNotesPage(page) {
  return page?.sourceTemplateEntityId === MEETING_NOTES_TEMPLATE_ID;
}

function dateMatches(meetingNote, date) {
  return !date || meetingNote.date === date;
}

export async function syncMeetingNotesFromConfluence({
  date,
  fetchPage,
  kvsClient,
  searchPages,
}) {
  const searchResponse = await searchPages({
    cql: SEARCH_CQL,
    limit: SEARCH_LIMIT,
  });
  const searchResult = await readJsonResponse(searchResponse, "search Confluence pages");

  if (!searchResult) {
    return 0;
  }

  let indexedCount = 0;

  for (const result of searchResult.results ?? []) {
    const pageId = result.content?.id;

    if (!pageId) {
      continue;
    }

    const pageResponse = await fetchPage(pageId);
    const page = await readJsonResponse(pageResponse, `fetch Confluence page ${pageId}`);

    if (!isMeetingNotesPage(page)) {
      continue;
    }

    const meetingNote = parseMeetingNotePage(page);

    if (!dateMatches(meetingNote, date)) {
      continue;
    }

    await saveMeetingNoteRecord(kvsClient, meetingNote);
    indexedCount += 1;
  }

  return indexedCount;
}
