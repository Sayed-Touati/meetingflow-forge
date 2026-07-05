export const LATEST_MEETING_KEY = "latest-meeting-data";

export function meetingNoteKey(pageId) {
  return `meeting-note:${pageId}`;
}

export function meetingNoteIndexKey(date) {
  return `meeting-note-index:${date}`;
}

function createMeetingNoteIndexEntry(meetingNote) {
  // The date picker/dropdown UI only needs a lightweight summary list.
  // Keeping full page data out of the index prevents each dropdown load from
  // pulling large meeting sections, tables, and links that are not yet visible.
  return {
    pageId: meetingNote.pageId,
    title: meetingNote.title,
    date: meetingNote.date,
    pageUrl: meetingNote.pageUrl,
  };
}

function latestMeetingMatchesDate(latestMeeting, date) {
  return latestMeeting?.pageId && latestMeeting.date === date;
}

function mergeMeetingNoteIndex(existingIndex, meetingNote) {
  const existingEntries = Array.isArray(existingIndex) ? existingIndex : [];
  const nextEntry = createMeetingNoteIndexEntry(meetingNote);
  const otherEntries = existingEntries.filter(
    (entry) => entry.pageId !== meetingNote.pageId,
  );

  return [nextEntry, ...otherEntries];
}

export async function saveMeetingNoteRecord(kvsClient, meetingNote) {
  // Keep the old "latest" key for the existing prototype UI, while also saving
  // the note by page ID so the next UI milestone can load a selected meeting.
  await kvsClient.set(LATEST_MEETING_KEY, meetingNote);
  await kvsClient.set(meetingNoteKey(meetingNote.pageId), meetingNote);

  if (!meetingNote.date) {
    return;
  }

  const indexKey = meetingNoteIndexKey(meetingNote.date);
  const existingIndex = await kvsClient.get(indexKey);

  await kvsClient.set(indexKey, mergeMeetingNoteIndex(existingIndex, meetingNote));
}

export async function listMeetingNotesForDate(kvsClient, date) {
  if (!date) {
    return [];
  }

  const index = await kvsClient.get(meetingNoteIndexKey(date));

  if (Array.isArray(index) && index.length > 0) {
    return index;
  }

  const latestMeeting = await kvsClient.get(LATEST_MEETING_KEY);

  return latestMeetingMatchesDate(latestMeeting, date)
    ? [createMeetingNoteIndexEntry(latestMeeting)]
    : [];
}

export async function getMeetingNoteRecord(kvsClient, pageId) {
  if (!pageId) {
    return null;
  }

  return (await kvsClient.get(meetingNoteKey(pageId))) ?? null;
}
