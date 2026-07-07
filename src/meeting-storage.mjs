export function meetingNoteKey(pageId) {
  return `meeting-note:${pageId}`;
}

export function meetingNoteIndexKey(date) {
  return `meeting-note-index:${date || "all"}`;
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

function mergeMeetingNoteIndex(existingIndex, meetingNote) {
  const existingEntries = Array.isArray(existingIndex) ? existingIndex : [];
  const nextEntry = createMeetingNoteIndexEntry(meetingNote);
  const otherEntries = existingEntries.filter(
    (entry) => entry.pageId !== meetingNote.pageId,
  );

  return [nextEntry, ...otherEntries];
}

function removeMeetingNoteIndexEntry(existingIndex, pageId) {
  const existingEntries = Array.isArray(existingIndex) ? existingIndex : [];

  return existingEntries.filter((entry) => entry.pageId !== pageId);
}

export async function saveMeetingNoteRecord(kvsClient, meetingNote) {
  await kvsClient.set(meetingNoteKey(meetingNote.pageId), meetingNote);

  const allIndexKey = meetingNoteIndexKey();
  const existingAllIndex = await kvsClient.get(allIndexKey);

  await kvsClient.set(
    allIndexKey,
    mergeMeetingNoteIndex(existingAllIndex, meetingNote),
  );

  if (!meetingNote.date) {
    return;
  }

  const indexKey = meetingNoteIndexKey(meetingNote.date);
  const existingIndex = await kvsClient.get(indexKey);

  await kvsClient.set(indexKey, mergeMeetingNoteIndex(existingIndex, meetingNote));
}

export async function removeMeetingNoteRecord(kvsClient, meetingNote) {
  if (!meetingNote?.pageId) {
    return;
  }

  await kvsClient.delete(meetingNoteKey(meetingNote.pageId));

  const allIndexKey = meetingNoteIndexKey();
  const existingAllIndex = await kvsClient.get(allIndexKey);
  await kvsClient.set(
    allIndexKey,
    removeMeetingNoteIndexEntry(existingAllIndex, meetingNote.pageId),
  );

  if (!meetingNote.date) {
    return;
  }

  const indexKey = meetingNoteIndexKey(meetingNote.date);
  const existingIndex = await kvsClient.get(indexKey);
  await kvsClient.set(
    indexKey,
    removeMeetingNoteIndexEntry(existingIndex, meetingNote.pageId),
  );
}

export async function listMeetingNotesForDate(kvsClient, date) {
  const index = await kvsClient.get(meetingNoteIndexKey(date));

  return Array.isArray(index) ? index : [];
}

export async function getMeetingNoteRecord(kvsClient, pageId) {
  if (!pageId) {
    return null;
  }

  return (await kvsClient.get(meetingNoteKey(pageId))) ?? null;
}
