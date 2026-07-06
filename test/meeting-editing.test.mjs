import test from "node:test";
import assert from "node:assert/strict";

import {
  EDIT_MEETING_FIELD_LABELS,
  getEditableInputValue,
  parseDiscussionTopicsText,
  parseListText,
  parseParticipantsText,
  parseRelatedInfoText,
  relatedLinksFromResources,
  stringifyDiscussionTopics,
  stringifyListItems,
  stringifyParticipants,
  stringifyRelatedInfo,
} from "../src/frontend/meeting-editing.mjs";

test("edit meeting labels match the Confluence meeting note fields", () => {
  assert.deepEqual(EDIT_MEETING_FIELD_LABELS, {
    title: "Title",
    date: "Date",
    time: "Time",
    participants: "Participants",
    goals: "Goals",
    brainstorm: "Brainstorm",
    discussionTopics: "Discussion topics",
    relatedInfo: "Related info",
  });
});

test("participant editing helpers preserve one display name per line", () => {
  const participants = [
    { accountId: "abc-123", displayName: "Sayed Touati" },
    { displayName: "Iheb Touati" },
  ];

  assert.equal(stringifyParticipants(participants), "Sayed Touati\nIheb Touati");
  assert.deepEqual(parseParticipantsText("Sayed Touati\n\nIheb Touati"), [
    { displayName: "Sayed Touati" },
    { displayName: "Iheb Touati" },
  ]);
});

test("generic list editing helpers show object labels instead of object text", () => {
  assert.equal(
    stringifyListItems([
      { title: "Confirm launch plan" },
      { text: "Review calendar automation" },
      { displayName: "Sayed Touati" },
    ]),
    "Confirm launch plan\nReview calendar automation\nSayed Touati",
  );
});

test("editable input helpers read text from Forge change events", () => {
  const event = {
    target: {
      value: "Confirm launch plan\nReview calendar automation",
    },
  };

  assert.equal(
    getEditableInputValue(event),
    "Confirm launch plan\nReview calendar automation",
  );
  assert.deepEqual(parseListText(event), [
    "Confirm launch plan",
    "Review calendar automation",
  ]);
});

test("discussion topic editing helpers preserve table fields", () => {
  const topics = [
    {
      time: "10:00",
      topic: "UI structure",
      presenter: { displayName: "Sayed Touati" },
      notes: "Keep it focused.",
    },
  ];

  assert.equal(
    stringifyDiscussionTopics(topics),
    "10:00 | UI structure | Sayed Touati | Keep it focused.",
  );
  assert.deepEqual(
    parseDiscussionTopicsText("10:00 | UI structure | Sayed Touati | Keep it focused."),
    [
      {
        time: "10:00",
        topic: "UI structure",
        presenter: { displayName: "Sayed Touati" },
        notes: "Keep it focused.",
      },
    ],
  );
});

test("related info editing helpers preserve Confluence-style link labels", () => {
  const resources = [
    {
      title: "Google Meet",
      linkText: "link",
      url: "https://meet.google.com/pio-ecmh-dzw?authuser=0&hs=122",
      type: "google-meet",
    },
  ];

  assert.equal(
    stringifyRelatedInfo(resources),
    "Google Meet: link | https://meet.google.com/pio-ecmh-dzw?authuser=0&hs=122",
  );
  assert.deepEqual(
    parseRelatedInfoText(
      "Google Meet: link | https://meet.google.com/pio-ecmh-dzw?authuser=0&hs=122",
    ),
    resources,
  );
  assert.deepEqual(relatedLinksFromResources(resources), [
    {
      href: "https://meet.google.com/pio-ecmh-dzw?authuser=0&hs=122",
      text: "Google Meet",
      linkText: "link",
      type: "google-meet",
    },
  ]);
});
