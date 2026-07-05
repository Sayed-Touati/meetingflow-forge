import test from "node:test";
import assert from "node:assert/strict";

import { syncMeetingNotesFromConfluence } from "../src/meeting-note-sync.mjs";
import { MEETING_NOTES_TEMPLATE_ID } from "../src/meeting-notes-template.mjs";

function createResponse(body) {
  return {
    ok: true,
    status: 200,
    async json() {
      return body;
    },
  };
}

function createMemoryKvs() {
  const values = new Map();

  return {
    values,
    async get(key) {
      return values.get(key);
    },
    async set(key, value) {
      values.set(key, value);
    },
  };
}

test("syncMeetingNotesFromConfluence indexes only Meeting Notes pages for the selected meeting date", async () => {
  const searchedQueries = [];
  const fetchedPageIds = [];
  const kvs = createMemoryKvs();
  const searchPages = async ({ cql, limit }) => {
    searchedQueries.push({ cql, limit });

    return createResponse({
      results: [
        { content: { id: "meeting-page" } },
        { content: { id: "normal-page" } },
        { content: { id: "other-date-meeting" } },
      ],
    });
  };
  const fetchPage = async (pageId) => {
    fetchedPageIds.push(pageId);

    if (pageId === "meeting-page") {
      return createResponse({
        id: "meeting-page",
        title: "Design sync",
        sourceTemplateEntityId: MEETING_NOTES_TEMPLATE_ID,
        _links: {
          base: "https://example.atlassian.net/wiki",
          webui: "/spaces/TEAM/pages/meeting-page/Design+sync",
        },
        body: {
          storage: {
            value: `
              <h2>Date</h2>
              <p><time datetime="2026-07-05" /></p>
              <h2>Goals</h2>
              <ul><li>Confirm workflow</li></ul>
            `,
          },
        },
      });
    }

    if (pageId === "normal-page") {
      return createResponse({
        id: "normal-page",
        title: "Normal page",
        sourceTemplateEntityId: "not-meeting-notes",
        body: { storage: { value: "" } },
      });
    }

    if (pageId === "other-date-meeting") {
      return createResponse({
        id: "other-date-meeting",
        title: "Other date sync",
        sourceTemplateEntityId: MEETING_NOTES_TEMPLATE_ID,
        body: {
          storage: {
            value: `
              <h2>Date</h2>
              <p><time datetime="2026-07-06" /></p>
            `,
          },
        },
      });
    }

    throw new Error(`Unexpected page ID: ${pageId}`);
  };

  const indexedNotes = await syncMeetingNotesFromConfluence({
    fetchPage,
    date: "2026-07-05",
    kvsClient: kvs,
    searchPages,
  });

  assert.equal(indexedNotes, 1);
  assert.deepEqual(kvs.values.get("meeting-note-index:2026-07-05"), [
    {
      pageId: "meeting-page",
      title: "Design sync",
      date: "2026-07-05",
      pageUrl: "https://example.atlassian.net/wiki/spaces/TEAM/pages/meeting-page/Design+sync",
    },
  ]);
  assert.deepEqual(searchedQueries, [
    { cql: "type=page order by lastmodified desc", limit: 50 },
  ]);
  assert.deepEqual(fetchedPageIds, [
    "meeting-page",
    "normal-page",
    "other-date-meeting",
  ]);
});
