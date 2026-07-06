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

test("syncMeetingNotesFromConfluence resolves account ID participant names before saving", async () => {
  const kvs = createMemoryKvs();
  const fetchedAccountIds = [];
  const searchPages = async () =>
    createResponse({
      results: [{ content: { id: "meeting-page" } }],
    });
  const fetchPage = async () =>
    createResponse({
      id: "meeting-page",
      title: "Participant sync",
      sourceTemplateEntityId: MEETING_NOTES_TEMPLATE_ID,
      body: {
        storage: {
          value: `
            <h2>Date</h2>
            <p><time datetime="2026-07-05" /></p>
            <h2>Participants</h2>
            <p>
              <ac:link><ri:user ri:account-id="712020:6c46aaa2-f232-401d-a887-aeb5da6ca229" /></ac:link>
              <ac:link><ri:user ri:account-id="712020:ee66f328-7efd-44eb-998e-de05a6ca745c" /></ac:link>
            </p>
          `,
        },
      },
    });
  const fetchUser = async (accountId) => {
    fetchedAccountIds.push(accountId);

    return createResponse({
      accountId,
      displayName:
        accountId === "712020:6c46aaa2-f232-401d-a887-aeb5da6ca229"
          ? "Sayed Touati"
          : "Iheb Touati",
    });
  };

  await syncMeetingNotesFromConfluence({
    fetchPage,
    fetchUser,
    kvsClient: kvs,
    searchPages,
  });

  assert.deepEqual(fetchedAccountIds, [
    "712020:6c46aaa2-f232-401d-a887-aeb5da6ca229",
    "712020:ee66f328-7efd-44eb-998e-de05a6ca745c",
  ]);
  assert.deepEqual(kvs.values.get("meeting-note:meeting-page").participants, [
    {
      accountId: "712020:6c46aaa2-f232-401d-a887-aeb5da6ca229",
      name: "Sayed Touati",
    },
    {
      accountId: "712020:ee66f328-7efd-44eb-998e-de05a6ca745c",
      name: "Iheb Touati",
    },
  ]);
});
