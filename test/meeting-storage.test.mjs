import test from "node:test";
import assert from "node:assert/strict";

import { saveMeetingNoteRecord } from "../src/meeting-storage.mjs";

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
