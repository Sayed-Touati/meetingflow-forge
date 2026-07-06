import test from "node:test";
import assert from "node:assert/strict";

import { parseMeetingNotePage } from "../src/meeting-parser.mjs";

test("parseMeetingNotePage returns structured meeting fields from Confluence storage", () => {
  const page = {
    id: "12345",
    title: "Design sync",
    _links: {
      base: "https://example.atlassian.net/wiki",
      webui: "/spaces/TEAM/pages/12345/Design+sync",
    },
    body: {
      storage: {
        value: `
          <h2><ac:emoticon ac:name="calendar_spiral" />&nbsp;Date</h2>
          <p><time datetime="2026-07-05" /></p>

          <h2>Time</h2>
          <p>10:00-11:00</p>

          <h2>Participants</h2>
          <p>
            <ac:link><ri:user ri:account-id="abc-123" /><ac:plain-text-link-body><![CDATA[Sayed Touati]]></ac:plain-text-link-body></ac:link>
            <ac:link><ri:user ri:account-id="def-456" /><ac:plain-text-link-body><![CDATA[Iheb Touati]]></ac:plain-text-link-body></ac:link>
          </p>

          <h2>Goals</h2>
          <ul>
            <li>Confirm meeting workflow</li>
            <li>Prepare calendar handoff</li>
          </ul>

          <h2>Brainstorm</h2>
          <ul>
            <li>Should Slack notification be automatic?</li>
            <li>Should edits update the calendar event?</li>
          </ul>

          <h2>Discussion topics</h2>
          <table>
            <tbody>
              <tr><th>Time</th><th>Topic</th><th>Presenter</th><th>Notes</th></tr>
              <tr>
                <td>10:00</td>
                <td>UI structure</td>
                <td><ac:link><ri:user ri:account-id="abc-123" /><ac:plain-text-link-body><![CDATA[Sayed Touati]]></ac:plain-text-link-body></ac:link></td>
                <td>Keep it confirmation-focused.</td>
              </tr>
              <tr><td>10:15</td><td>Calendar link</td><td>Iheb</td><td>Extract the Google Meet URL.</td></tr>
            </tbody>
          </table>

          <h2>Related info</h2>
          <p>
            Join with <a href="https://meet.google.com/abc-defg-hij">Google Meet</a>
            and read <a href="https://example.com/spec">the spec</a>.
          </p>
        `,
      },
    },
  };

  assert.deepEqual(parseMeetingNotePage(page), {
    pageId: "12345",
    title: "Design sync",
    date: "2026-07-05",
    startTime: "10:00",
    endTime: "11:00",
    pageUrl: "https://example.atlassian.net/wiki/spaces/TEAM/pages/12345/Design+sync",
    participants: [
      { accountId: "abc-123", displayName: "Sayed Touati" },
      { accountId: "def-456", displayName: "Iheb Touati" },
    ],
    goals: ["Confirm meeting workflow", "Prepare calendar handoff"],
    brainstorm: [
      "Should Slack notification be automatic?",
      "Should edits update the calendar event?",
    ],
    discussionTopics: [
      {
        time: "10:00",
        topic: "UI structure",
        presenter: {
          accountId: "abc-123",
          displayName: "Sayed Touati",
        },
        notes: "Keep it confirmation-focused.",
      },
      {
        time: "10:15",
        topic: "Calendar link",
        presenter: {
          displayName: "Iheb",
        },
        notes: "Extract the Google Meet URL.",
      },
    ],
    resources: [
      {
        title: "Google Meet",
        url: "https://meet.google.com/abc-defg-hij",
        type: "google-meet",
      },
      {
        title: "the spec",
        url: "https://example.com/spec",
        type: "link",
      },
    ],
    relatedLinks: [
      {
        href: "https://meet.google.com/abc-defg-hij",
        text: "Google Meet",
        type: "google-meet",
      },
      {
        href: "https://example.com/spec",
        text: "the spec",
        type: "link",
      },
    ],
    sections: {
      Date: "",
      Time: "10:00-11:00",
      Participants: "Sayed Touati Iheb Touati",
      Goals: "Confirm meeting workflow Prepare calendar handoff",
      Brainstorm: "Should Slack notification be automatic? Should edits update the calendar event?",
      "Discussion topics": "10:00 UI structure Sayed Touati Keep it confirmation-focused. 10:15 Calendar link Iheb Extract the Google Meet URL.",
      "Related info": "Join with Google Meet and read the spec.",
    },
  });
});

test("parseMeetingNotePage extracts participant mentions from supported Confluence user reference shapes", () => {
  const page = {
    id: "participant-shapes",
    title: "Participant parser sync",
    body: {
      storage: {
        value: `
          <h2>Participants</h2>
          <p>
            <ac:link><ri:user ri:account-id="abc-123" /></ac:link>
            <ac:link><ri:user ri:account-id="def-456" /><ac:link-body><strong>Dana Forge</strong></ac:link-body></ac:link>
            <ac:link><ri:user ri:userkey="legacy-user-key" /></ac:link>
            <ac:link><ri:user ri:username="old.username" /></ac:link>
            <ri:user ri:account-id="bare-user-node" />
          </p>
        `,
      },
    },
  };

  assert.deepEqual(parseMeetingNotePage(page).participants, [
    { accountId: "abc-123", displayName: "abc-123" },
    { accountId: "def-456", displayName: "Dana Forge" },
    { userKey: "legacy-user-key", displayName: "legacy-user-key" },
    { username: "old.username", displayName: "old.username" },
    { accountId: "bare-user-node", displayName: "bare-user-node" },
  ]);
});

test("parseMeetingNotePage handles missing optional structured sections safely", () => {
  const page = {
    id: "empty-shapes",
    title: "Empty sync",
    body: {
      storage: {
        value: `
          <h2>Date</h2>
          <p><time datetime="2026-07-06" /></p>
          <h2>Discussion topics</h2>
          <table>
            <tbody>
              <tr><th>Time</th><th>Topic</th><th>Presenter</th><th>Notes</th></tr>
              <tr><td>12:00</td><td></td><td></td><td></td></tr>
            </tbody>
          </table>
        `,
      },
    },
  };

  const meetingNote = parseMeetingNotePage(page);

  assert.deepEqual(meetingNote.participants, []);
  assert.deepEqual(meetingNote.goals, []);
  assert.deepEqual(meetingNote.brainstorm, []);
  assert.deepEqual(meetingNote.resources, []);
  assert.deepEqual(meetingNote.discussionTopics, [
    {
      time: "12:00",
      topic: "",
      presenter: null,
      notes: "",
    },
  ]);
});
