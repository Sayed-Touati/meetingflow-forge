import test from "node:test";
import assert from "node:assert/strict";

import {
  getMeetingNoteRecord,
  listMeetingNotesForDate,
  removeMeetingNoteRecord,
  saveMeetingNoteRecord,
} from "../src/meeting-storage.mjs";

function createMemoryKvs(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));
  const writes = [];

  return {
    deletes: [],
    writes,
    async get(key) {
      return values.get(key);
    },
    async set(key, value) {
      writes.push({ key, value });
      values.set(key, value);
    },
    async delete(key) {
      this.deletes.push(key);
      values.delete(key);
    },
  };
}

test("saveMeetingNoteRecord stores page note and meeting-note indexes", async () => {
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

test("listMeetingNotesForDate ignores latest note when no indexed notes exist", async () => {
  const kvs = createMemoryKvs({
    "latest-meeting-data": {
      title: "Latest sync",
      date: "2026-07-05",
      pageUrl: "https://example.com/latest",
    },
  });

  assert.deepEqual(await listMeetingNotesForDate(kvs), []);
});

test("listMeetingNotesForDate returns an empty list when no date index exists", async () => {
  const kvs = createMemoryKvs();

  assert.deepEqual(await listMeetingNotesForDate(kvs, "2026-07-06"), []);
});

test("listMeetingNotesForDate ignores latest note when filtering by date", async () => {
  const kvs = createMemoryKvs({
    "latest-meeting-data": {
      pageId: "latest-page",
      title: "Latest sync",
      date: "2026-07-05",
      pageUrl: "https://example.com/latest",
    },
  });

  assert.deepEqual(await listMeetingNotesForDate(kvs, "2026-07-05"), []);
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

test("getMeetingNoteRecord does not load legacy latest note as a selectable meeting", async () => {
  const latestMeetingNote = {
    title: "Latest sync",
    date: "2026-07-05",
    pageUrl: "https://example.com/latest",
  };
  const kvs = createMemoryKvs({
    "latest-meeting-data": latestMeetingNote,
  });

  assert.equal(await getMeetingNoteRecord(kvs, "latest-meeting-data"), null);
});

test("removeMeetingNoteRecord deletes the full note and selector index entries", async () => {
  const kvs = createMemoryKvs({
    "meeting-note:removed-page": {
      pageId: "removed-page",
      title: "Removed sync",
      date: "2026-07-05",
    },
    "meeting-note-index:all": [
      {
        pageId: "removed-page",
        title: "Removed sync",
        date: "2026-07-05",
      },
      {
        pageId: "kept-page",
        title: "Kept sync",
        date: "2026-07-06",
      },
    ],
    "meeting-note-index:2026-07-05": [
      {
        pageId: "removed-page",
        title: "Removed sync",
        date: "2026-07-05",
      },
    ],
  });

  await removeMeetingNoteRecord(kvs, {
    pageId: "removed-page",
    date: "2026-07-05",
  });

  assert.deepEqual(kvs.deletes, ["meeting-note:removed-page"]);
  assert.deepEqual(await listMeetingNotesForDate(kvs), [
    {
      pageId: "kept-page",
      title: "Kept sync",
      date: "2026-07-06",
    },
  ]);
  assert.deepEqual(await listMeetingNotesForDate(kvs, "2026-07-05"), []);
  assert.equal(await getMeetingNoteRecord(kvs, "removed-page"), null);
});
