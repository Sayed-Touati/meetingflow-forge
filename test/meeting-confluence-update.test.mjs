import test from "node:test";
import assert from "node:assert/strict";

import {
  createMeetingNoteStorageValue,
  updateConfluenceMeetingNotePage,
} from "../src/meeting-confluence-update.mjs";

const editedMeetingData = {
  pageId: "12345",
  title: "Edited planning meeting",
  date: "2026-07-07",
  startTime: "10:00",
  endTime: "11:00",
  participants: [{ displayName: "Sayed Touati" }, { displayName: "Iheb Touati" }],
  goals: ["Confirm launch plan", "Review calendar automation"],
  brainstorm: ["Keep Forge edits smooth", "Sync saved edits to Confluence"],
  discussionTopics: [
    {
      time: "10:15",
      topic: "Editing flow",
      presenter: { displayName: "Sayed Touati" },
      notes: ["Allow spaces and new lines", "Save the edited table"],
    },
  ],
  resources: [
    {
      title: "Google Meet",
      linkText: "link",
      url: "https://meet.google.com/pio-ecmh-dzw",
      type: "google-meet",
    },
  ],
};

test("storage value includes every editable meeting field", () => {
  const storageValue = createMeetingNoteStorageValue(editedMeetingData);

  assert.match(storageValue, /<time datetime="2026-07-07" \/>/);
  assert.match(storageValue, /10:00 - 11:00/);
  assert.match(storageValue, /Sayed Touati/);
  assert.match(storageValue, /Iheb Touati/);
  assert.match(storageValue, /Confirm launch plan/);
  assert.match(storageValue, /Keep Forge edits smooth/);
  assert.match(storageValue, /Editing flow/);
  assert.match(storageValue, /Allow spaces and new lines/);
  assert.match(storageValue, /<a href="https:\/\/meet.google.com\/pio-ecmh-dzw">link<\/a>/);
});

test("updateConfluenceMeetingNotePage sends edited storage to Confluence", async () => {
  let updatedPageId;
  let updatedBody;

  const result = await updateConfluenceMeetingNotePage({
    meetingData: editedMeetingData,
    fetchPage: async () => ({
      ok: true,
      json: async () => ({
        id: "12345",
        title: "Original title",
        spaceId: "SPACE",
        version: { number: 4 },
      }),
    }),
    updatePage: async (pageId, body) => {
      updatedPageId = pageId;
      updatedBody = body;

      return {
        ok: true,
        json: async () => ({}),
      };
    },
  });

  assert.equal(updatedPageId, "12345");
  assert.equal(updatedBody.title, "Edited planning meeting");
  assert.equal(updatedBody.version.number, 5);
  assert.equal(updatedBody.version.message, "Updated from MeetingFlow");
  assert.equal(updatedBody.body.representation, "storage");
  assert.match(updatedBody.body.value, /Review calendar automation/);
  assert.match(updatedBody.body.value, /Save the edited table/);
  assert.equal(result.title, "Edited planning meeting");
});
