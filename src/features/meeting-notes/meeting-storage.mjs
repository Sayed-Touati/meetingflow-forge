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
  const entry = {
    pageId: meetingNote.pageId,
    title: meetingNote.title,
    date: meetingNote.date,
    pageUrl: meetingNote.pageUrl,
  };

  if (meetingNote.calendarEvent?.eventId) {
    entry.hasCalendarEvent = true;
  }

  return entry;
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
  const existingMeetingNote = await getMeetingNoteRecord(kvsClient, meetingNote.pageId);
  const meetingNoteToSave = {
    ...meetingNote,
    ...(!("calendarEvent" in meetingNote) && existingMeetingNote?.calendarEvent
      ? { calendarEvent: existingMeetingNote.calendarEvent }
      : {}),
  };

  await kvsClient.set(meetingNoteKey(meetingNoteToSave.pageId), meetingNoteToSave);

  const allIndexKey = meetingNoteIndexKey();
  const existingAllIndex = await kvsClient.get(allIndexKey);

  await kvsClient.set(
    allIndexKey,
    mergeMeetingNoteIndex(existingAllIndex, meetingNoteToSave),
  );

  if (existingMeetingNote?.date && existingMeetingNote.date !== meetingNoteToSave.date) {
    const existingDateIndex = await kvsClient.get(
      meetingNoteIndexKey(existingMeetingNote.date),
    );
    await kvsClient.set(
      meetingNoteIndexKey(existingMeetingNote.date),
      removeMeetingNoteIndexEntry(existingDateIndex, meetingNoteToSave.pageId),
    );
  }

  if (!meetingNoteToSave.date) {
    return;
  }

  const indexKey = meetingNoteIndexKey(meetingNoteToSave.date);
  const existingIndex = await kvsClient.get(indexKey);

  await kvsClient.set(
    indexKey,
    mergeMeetingNoteIndex(existingIndex, meetingNoteToSave),
  );
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

export async function addCalendarEventToMeetingNoteRecord(
  kvsClient,
  pageId,
  calendarEvent,
) {
  const meetingNote = await getMeetingNoteRecord(kvsClient, pageId);

  if (!meetingNote) {
    return null;
  }

  const updatedMeetingNote = {
    ...meetingNote,
    calendarEvent: {
      eventId: calendarEvent.eventId,
      eventUrl: calendarEvent.eventUrl,
      meetUrl: calendarEvent.meetUrl,
      startDateTime: calendarEvent.startDateTime,
      endDateTime: calendarEvent.endDateTime,
      timeZone: calendarEvent.timeZone,
    },
  };

  await saveMeetingNoteRecord(kvsClient, updatedMeetingNote);

  return updatedMeetingNote;
}

export function createCalendarEventStatus(meetingNote, now = new Date()) {
  const calendarEvent = meetingNote?.calendarEvent;

  if (!calendarEvent?.eventId) {
    return {
      hasCalendarEvent: false,
      canDeleteCalendarEvent: false,
      calendarEvent: null,
    };
  }

  const startTime = Date.parse(calendarEvent.startDateTime ?? "");

  return {
    hasCalendarEvent: true,
    canDeleteCalendarEvent: Number.isFinite(startTime)
      ? startTime > now.getTime()
      : false,
    calendarEvent,
  };
}

export function createMeetingDeletionPlan(
  meetingNote,
  { deleteCalendarEvent = false } = {},
  now = new Date(),
) {
  const calendarEventStatus = createCalendarEventStatus(meetingNote, now);

  if (!deleteCalendarEvent) {
    return {
      canDeleteMeetingNote: true,
      shouldDeleteCalendarEvent: false,
      message: "",
    };
  }

  if (!calendarEventStatus.hasCalendarEvent) {
    return {
      canDeleteMeetingNote: true,
      shouldDeleteCalendarEvent: false,
      message: "",
    };
  }

  if (!calendarEventStatus.canDeleteCalendarEvent) {
    return {
      canDeleteMeetingNote: false,
      shouldDeleteCalendarEvent: false,
      message:
        "The Google Calendar event has already started. Choose Delete note only to remove the Confluence meeting note.",
    };
  }

  return {
    canDeleteMeetingNote: true,
    shouldDeleteCalendarEvent: true,
    message: "",
  };
}
