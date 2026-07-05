import test from "node:test";
import assert from "node:assert/strict";

import {
  getMeetingNoteRecord,
  listMeetingNotesForDate,
  saveMeetingNoteRecord,
} from "../src/meeting-storage.mjs";

function createMemoryKvs(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));
  const writes = [];

  return {
    writes,
    async get(key) {
      return values.get(key);
    },
    async set(key, value) {
      writes.push({ key, value });
      values.set(key, value);
    },
  };
}

test("saveMeetingNoteRecord stores latest note, page note, and date index entry", async () => {
  const kvs = createMemoryKvs({
    "meeting-note-index:2026-07-05": [
      {
        pageId: "old-page",
        title: "Older sync",
        date: "2026-07-05",
        pageUrl: "https://example.com/old",
      },
    ],
  });
  const meetingNote = {
    pageId: "new-page",
    title: "Design sync",
    date: "2026-07-05",
    pageUrl: "https://example.com/new",
  };

  await saveMeetingNoteRecord(kvs, meetingNote);

  assert.deepEqual(kvs.writes, [
    { key: "latest-meeting-data", value: meetingNote },
    { key: "meeting-note:new-page", value: meetingNote },
    {
      key: "meeting-note-index:all",
      value: [
        {
          pageId: "new-page",
          title: "Design sync",
          date: "2026-07-05",
          pageUrl: "https://example.com/new",
        },
      ],
    },
    {
      key: "meeting-note-index:2026-07-05",
      value: [
        {
          pageId: "new-page",
          title: "Design sync",
          date: "2026-07-05",
          pageUrl: "https://example.com/new",
        },
        {
          pageId: "old-page",
          title: "Older sync",
          date: "2026-07-05",
          pageUrl: "https://example.com/old",
        },
      ],
    },
  ]);
});

test("listMeetingNotesForDate returns all indexed notes when no date is provided", async () => {
  const kvs = createMemoryKvs({
    "meeting-note-index:all": [
      {
        pageId: "page-one",
        title: "First sync",
        date: "2026-07-05",
        pageUrl: "https://example.com/one",
      },
      {
        pageId: "page-two",
        title: "Second sync",
        date: "2026-07-06",
        pageUrl: "https://example.com/two",
      },
    ],
  });

  assert.deepEqual(await listMeetingNotesForDate(kvs), [
    {
      pageId: "page-one",
      title: "First sync",
      date: "2026-07-05",
      pageUrl: "https://example.com/one",
    },
    {
      pageId: "page-two",
      title: "Second sync",
      date: "2026-07-06",
      pageUrl: "https://example.com/two",
    },
  ]);
});

test("listMeetingNotesForDate falls back to latest note when no date is provided and no all index exists", async () => {
  const kvs = createMemoryKvs({
    "latest-meeting-data": {
      pageId: "latest-page",
      title: "Latest sync",
      date: "2026-07-05",
      pageUrl: "https://example.com/latest",
    },
  });

  assert.deepEqual(await listMeetingNotesForDate(kvs), [
    {
      pageId: "latest-page",
      title: "Latest sync",
      date: "2026-07-05",
      pageUrl: "https://example.com/latest",
    },
  ]);
});

test("listMeetingNotesForDate returns an empty list when no date index exists", async () => {
  const kvs = createMemoryKvs();

  assert.deepEqual(await listMeetingNotesForDate(kvs, "2026-07-06"), []);
});

test("listMeetingNotesForDate falls back to latest note while old storage is being migrated", async () => {
  const kvs = createMemoryKvs({
    "latest-meeting-data": {
      pageId: "latest-page",
      title: "Latest sync",
      date: "2026-07-05",
      pageUrl: "https://example.com/latest",
    },
  });

  assert.deepEqual(await listMeetingNotesForDate(kvs, "2026-07-05"), [
    {
      pageId: "latest-page",
      title: "Latest sync",
      date: "2026-07-05",
      pageUrl: "https://example.com/latest",
    },
  ]);
});

test("getMeetingNoteRecord loads one full meeting note by page ID", async () => {
  const meetingNote = {
    pageId: "new-page",
    title: "Design sync",
  };
  const kvs = createMemoryKvs({
    "meeting-note:new-page": meetingNote,
  });

  assert.deepEqual(await getMeetingNoteRecord(kvs, "new-page"), meetingNote);
});
