import test from "node:test";
import assert from "node:assert/strict";

import {
  archiveConfluenceMeetingNotePage,
  deleteConfluenceMeetingNotePage,
} from "../src/features/confluence/meeting-confluence-removal.mjs";

test("archiveConfluenceMeetingNotePage submits the page to Confluence archive", async () => {
  let archiveBody;

  await archiveConfluenceMeetingNotePage({
    pageId: "12345",
    archivePages: async (body) => {
      archiveBody = body;

      return {
        ok: true,
        status: 202,
        json: async () => ({ id: "archive-task" }),
      };
    },
  });

  assert.deepEqual(archiveBody, {
    pages: [{ id: "12345" }],
  });
});

test("deleteConfluenceMeetingNotePage deletes the Confluence page by id", async () => {
  let deletedPageId;

  await deleteConfluenceMeetingNotePage({
    pageId: "12345",
    deletePage: async (pageId) => {
      deletedPageId = pageId;

      return {
        ok: true,
        status: 204,
      };
    },
  });

  assert.equal(deletedPageId, "12345");
});

test("Confluence removal helpers throw when Confluence rejects the operation", async () => {
  await assert.rejects(
    () =>
      deleteConfluenceMeetingNotePage({
        pageId: "12345",
        deletePage: async () => ({
          ok: false,
          status: 403,
          statusText: "Forbidden",
        }),
      }),
    /MeetingFlow failed to delete Confluence page 12345/,
  );
});
