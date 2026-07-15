import { parseMeetingNotePage } from "./features/meeting-notes/meeting-parser.mjs";
import { resolveParticipantDisplayNames } from "./features/meeting-notes/participant-resolver.mjs";
import { saveMeetingNoteRecord } from "./features/meeting-notes/meeting-storage.mjs";
import { MEETING_NOTES_TEMPLATE_ID } from "./features/meeting-notes/constants.mjs";

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

async function parseAndSaveMeetingPage({
  fetchUser,
  kvsClient,
  meetingNote,
  page,
  prepareMeetingNote = (meetingNote) => meetingNote,
}) {
  const parsedMeetingNote = meetingNote ?? parseMeetingNotePage(page);
  const meetingNoteWithParticipantNames = await resolveParticipantDisplayNames(
    parsedMeetingNote,
    { fetchUser },
  );
  const preparedMeetingNote = await prepareMeetingNote(meetingNoteWithParticipantNames);

  await saveMeetingNoteRecord(kvsClient, preparedMeetingNote);

  return preparedMeetingNote;
}

export async function refreshMeetingNoteFromConfluence({
  fetchPage,
  fetchUser,
  kvsClient,
  pageId,
  prepareMeetingNote = (meetingNote) => meetingNote,
}) {
  if (!pageId) {
    return null;
  }

  const pageResponse = await fetchPage(pageId);
  const page = await readJsonResponse(pageResponse, `fetch Confluence page ${pageId}`);

  if (!isMeetingNotesPage(page)) {
    return null;
  }

  return parseAndSaveMeetingPage({
    fetchUser,
    kvsClient,
    page,
    prepareMeetingNote,
  });
}

export async function syncMeetingNotesFromConfluence({
  date,
  fetchPage,
  fetchUser,
  kvsClient,
  prepareMeetingNote = (meetingNote) => meetingNote,
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

    await parseAndSaveMeetingPage({
      fetchUser,
      kvsClient,
      meetingNote,
      page,
      prepareMeetingNote,
    });
    indexedCount += 1;
  }

  return indexedCount;
}
