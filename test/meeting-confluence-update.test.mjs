import test from "node:test";
import assert from "node:assert/strict";

import {
  createMeetingNoteStorageValue,
  updateMeetingNoteStorageValue,
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

  assert.match(storageValue, /<time datetime="2026-07-07"/);
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

test("updateMeetingNoteStorageValue preserves non-editable template content", () => {
  const currentStorageValue = `
    <h1>Meeting notes</h1>
    <p>Keep this hand-written introduction.</p>

    <h2>Date</h2>
    <p><time datetime="2026-07-01" /></p>

    <h2>Time</h2>
    <p>09:00 - 09:30</p>

    <h2>Participants</h2>
    <p>
      <ac:link><ri:user ri:account-id="account-a" /></ac:link>
    </p>

    <h2>Goals</h2>
    <ul><li>Old goal</li></ul>

    <h2>Decisions</h2>
    <ac:structured-macro ac:name="status">
      <ac:parameter ac:name="colour">Green</ac:parameter>
      <ac:plain-text-body><![CDATA[Approved]]></ac:plain-text-body>
    </ac:structured-macro>
  `;

  const updatedStorageValue = updateMeetingNoteStorageValue(
    currentStorageValue,
    editedMeetingData,
  );

  assert.match(updatedStorageValue, /Keep this hand-written introduction\./);
  assert.match(updatedStorageValue, /<h2>Decisions<\/h2>/);
  assert.match(updatedStorageValue, /<ac:structured-macro ac:name="status">/);
  assert.match(updatedStorageValue, /Confirm launch plan/);
  assert.doesNotMatch(updatedStorageValue, /Old goal/);
  assert.match(updatedStorageValue, /<time datetime="2026-07-07"/);
});

test("updateMeetingNoteStorageValue appends missing editable sections without removing existing content", () => {
  const currentStorageValue = `
    <h2>Date</h2>
    <p><time datetime="2026-07-01" /></p>
    <h2>Custom notes</h2>
    <p>Keep this section.</p>
  `;

  const updatedStorageValue = updateMeetingNoteStorageValue(
    currentStorageValue,
    editedMeetingData,
  );

  assert.match(updatedStorageValue, /<h2>Custom notes<\/h2>/);
  assert.match(updatedStorageValue, /Keep this section\./);
  assert.match(updatedStorageValue, /<h2>Time<\/h2>/);
  assert.match(updatedStorageValue, /10:00 - 11:00/);
  assert.match(updatedStorageValue, /<h2>Discussion topics<\/h2>/);
  assert.match(updatedStorageValue, /<h2>Related info<\/h2>/);
});

test("updateMeetingNoteStorageValue replaces lower-level headings inside editable sections", () => {
  const currentStorageValue = `
    <h2>Goals</h2>
    <h3>Old nested goal heading</h3>
    <p>Old nested goal detail.</p>
    <h2>Custom notes</h2>
    <p>Keep this section.</p>
  `;

  const updatedStorageValue = updateMeetingNoteStorageValue(
    currentStorageValue,
    editedMeetingData,
  );

  assert.doesNotMatch(updatedStorageValue, /Old nested goal heading/);
  assert.doesNotMatch(updatedStorageValue, /Old nested goal detail/);
  assert.match(updatedStorageValue, /Confirm launch plan/);
  assert.match(updatedStorageValue, /<h2>Custom notes<\/h2>/);
  assert.match(updatedStorageValue, /Keep this section\./);
});

test("updateMeetingNoteStorageValue replaces editable sections inside Confluence layout wrappers", () => {
  const currentStorageValue = `
    <ac:layout>
      <ac:layout-section ac:type="single">
        <ac:layout-cell>
          <h2>Date</h2>
          <p><time datetime="2026-07-01" /></p>
          <h2>Goals</h2>
          <ul><li>Old wrapped goal</li></ul>
          <h2>Template notes</h2>
          <p>Keep wrapped custom content.</p>
        </ac:layout-cell>
      </ac:layout-section>
    </ac:layout>
  `;

  const updatedStorageValue = updateMeetingNoteStorageValue(
    currentStorageValue,
    editedMeetingData,
  );

  assert.match(updatedStorageValue, /<ac:layout>/);
  assert.match(updatedStorageValue, /<ac:layout-cell>/);
  assert.match(updatedStorageValue, /<time datetime="2026-07-07"/);
  assert.match(updatedStorageValue, /Confirm launch plan/);
  assert.doesNotMatch(updatedStorageValue, /Old wrapped goal/);
  assert.match(updatedStorageValue, /Template notes/);
  assert.match(updatedStorageValue, /Keep wrapped custom content\./);
  assert.equal(
    (updatedStorageValue.match(/<h2>Goals<\/h2>/g) ?? []).length,
    1,
  );
});

test("updateMeetingNoteStorageValue recognizes icon-prefixed Meeting Notes template headings", () => {
  const currentStorageValue = `
    <h2><ac:emoticon ac:name="calendar" />&nbsp;Date</h2>
    <p><time datetime="2026-07-01" /></p>
    <h2><ac:emoticon ac:name="busts_in_silhouette" />&nbsp;Participants</h2>
    <p><ac:link><ri:user ri:account-id="account-a" /></ac:link></p>
    <h2><ac:emoticon ac:name="goal" />&nbsp;Goals</h2>
    <ul><li>Old template goal</li></ul>
    <h2><ac:emoticon ac:name="art" />&nbsp;Brainstorm</h2>
    <p>Old brainstorm</p>
    <h2><ac:emoticon ac:name="speaking_head" />&nbsp;Discussion topics</h2>
    <table>
      <tbody>
        <tr><th>Time</th><th>Topic</th><th>Presenter</th><th>Notes</th></tr>
      </tbody>
    </table>
    <h2><ac:emoticon ac:name="white_check_mark" />&nbsp;Action items</h2>
    <p>Keep action items.</p>
    <h2><ac:emoticon ac:name="arrow_heading_up" />&nbsp;Decisions</h2>
    <p>Keep decisions.</p>
    <h2><ac:emoticon ac:name="card_box" />&nbsp;Related info</h2>
    <p>Old related info</p>
  `;

  const updatedStorageValue = updateMeetingNoteStorageValue(
    currentStorageValue,
    editedMeetingData,
  );

  assert.match(updatedStorageValue, /<ac:emoticon ac:name="calendar"\/>/);
  assert.match(updatedStorageValue, /<ac:emoticon ac:name="goal"\/>/);
  assert.match(updatedStorageValue, /<ac:emoticon ac:name="card_box"\/>/);
  assert.match(updatedStorageValue, /<time datetime="2026-07-07"/);
  assert.match(updatedStorageValue, /Sayed Touati/);
  assert.match(updatedStorageValue, /Confirm launch plan/);
  assert.match(updatedStorageValue, /hello|Keep Forge edits smooth/);
  assert.match(updatedStorageValue, /Editing flow/);
  assert.match(updatedStorageValue, /Google Meet/);
  assert.doesNotMatch(updatedStorageValue, /Old template goal/);
  assert.doesNotMatch(updatedStorageValue, /Old brainstorm/);
  assert.doesNotMatch(updatedStorageValue, /Old related info/);
  assert.match(updatedStorageValue, /Keep action items\./);
  assert.match(updatedStorageValue, /Keep decisions\./);
  assert.equal(
    (updatedStorageValue.match(/Date<\/h2>/g) ?? []).length,
    1,
  );
  assert.equal(
    (updatedStorageValue.match(/Goals<\/h2>/g) ?? []).length,
    1,
  );
});

test("updateConfluenceMeetingNotePage updates the fetched full storage body", async () => {
  let updatedBody;

  await updateConfluenceMeetingNotePage({
    meetingData: editedMeetingData,
    fetchPage: async () => ({
      ok: true,
      json: async () => ({
        id: "12345",
        title: "Original title",
        spaceId: "SPACE",
        version: { number: 4 },
        body: {
          storage: {
            value: `
              <h2>Goals</h2>
              <ul><li>Old goal</li></ul>
              <h2>Template-only section</h2>
              <p>This must survive.</p>
            `,
          },
        },
      }),
    }),
    updatePage: async (pageId, body) => {
      updatedBody = body;

      return {
        ok: true,
        json: async () => ({}),
      };
    },
  });

  assert.equal(updatedBody.body.representation, "storage");
  assert.match(updatedBody.body.value, /This must survive\./);
  assert.match(updatedBody.body.value, /Confirm launch plan/);
  assert.doesNotMatch(updatedBody.body.value, /Old goal/);
});

test("updateConfluenceMeetingNotePage falls back to current title for blank edits", async () => {
  let updatedBody;

  const result = await updateConfluenceMeetingNotePage({
    meetingData: {
      ...editedMeetingData,
      title: "   ",
    },
    fetchPage: async () => ({
      ok: true,
      json: async () => ({
        id: "12345",
        title: "Original title",
        version: { number: 4 },
        body: {
          storage: {
            value: "<h2>Goals</h2><ul><li>Old goal</li></ul>",
          },
        },
      }),
    }),
    updatePage: async (pageId, body) => {
      updatedBody = body;

      return {
        ok: true,
        json: async () => ({}),
      };
    },
  });

  assert.equal(updatedBody.title, "Original title");
  assert.equal(result.title, "Original title");
});
