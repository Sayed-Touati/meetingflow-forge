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

          <h2>Discussion topics</h2>
          <table>
            <tbody>
              <tr><th>Time</th><th>Topic</th><th>Presenter</th><th>Notes</th></tr>
              <tr><td>10:00</td><td>UI structure</td><td>Sayed</td><td>Keep it confirmation-focused.</td></tr>
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
    pageUrl: "https://example.atlassian.net/wiki/spaces/TEAM/pages/12345/Design+sync",
    participants: [
      { accountId: "abc-123", name: "Sayed Touati" },
      { accountId: "def-456", name: "Iheb Touati" },
    ],
    goals: ["Confirm meeting workflow", "Prepare calendar handoff"],
    discussionTopics: [
      {
        time: "10:00",
        topic: "UI structure",
        presenter: "Sayed",
        notes: "Keep it confirmation-focused.",
      },
      {
        time: "10:15",
        topic: "Calendar link",
        presenter: "Iheb",
        notes: "Extract the Google Meet URL.",
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
      Participants: "Sayed Touati Iheb Touati",
      Goals: "Confirm meeting workflow Prepare calendar handoff",
      "Discussion topics": "10:00 UI structure Sayed Keep it confirmation-focused. 10:15 Calendar link Iheb Extract the Google Meet URL.",
      "Related info": "Join with Google Meet and read the spec.",
    },
  });
});
