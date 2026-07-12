import test from "node:test";
import assert from "node:assert/strict";

import {
  addOrUpdateGoogleMeetResource,
  buildCalendarDescription,
  buildCalendarDescriptionPreview,
  createCalendarEventDraft,
  normalizeCalendarTime,
  validateCalendarEventDraft,
} from "../src/calendar-event-form.mjs";

const meetingData = {
  pageId: "12345",
  title: "Launch planning",
  date: "2026-07-08",
  startTime: "09:30",
  endTime: "10:15",
  pageUrl: "https://example.atlassian.net/wiki/spaces/TEAM/pages/12345/Launch",
  participants: [
    { accountId: "abc-123", displayName: "Sayed Touati", email: "sayed@example.com" },
    { accountId: "def-456", displayName: "Iheb Touati" },
  ],
  goals: ["Confirm launch plan", "Assign follow-ups"],
  resources: [
    {
      title: "Planning doc",
      linkText: "link",
      url: "https://drive.google.com/document/d/example",
      type: "link",
    },
  ],
};

test("createCalendarEventDraft leaves event title empty so the placeholder is visible", () => {
  assert.deepEqual(createCalendarEventDraft(meetingData), {
    title: "",
    date: "2026-07-08",
    startTime: "09:30",
    endTime: "10:15",
    inviteGuests: false,
    guestsCanInviteOthers: false,
    guestsCanSeeOtherGuests: true,
    includeGoogleMeet: true,
    guests: [
      {
        key: "abc-123",
        name: "Sayed Touati",
        email: "sayed@example.com",
        isKnownParticipant: true,
      },
      {
        key: "def-456",
        name: "Iheb Touati",
        email: "",
        isKnownParticipant: true,
      },
    ],
  });
});

test("createCalendarEventDraft pre-fills update mode from linked calendar metadata", () => {
  const draft = createCalendarEventDraft({
    ...meetingData,
    calendarEvent: {
      eventId: "event-123",
      title: "Existing calendar title",
      startDateTime: "2026-07-09T14:30:00Z",
      endDateTime: "2026-07-09T15:45:00Z",
      timeZone: "Africa/Tunis",
      inviteGuests: true,
      guestsCanInviteOthers: true,
      guestsCanSeeOtherGuests: false,
      includeGoogleMeet: false,
      guests: [
        {
          key: "guest-1",
          name: "Existing Guest",
          email: "guest@example.com",
          isKnownParticipant: false,
        },
      ],
    },
  }, { mode: "update" });

  assert.equal(draft.title, "Existing calendar title");
  assert.equal(draft.date, "2026-07-09");
  assert.equal(draft.startTime, "14:30");
  assert.equal(draft.endTime, "15:45");
  assert.equal(draft.inviteGuests, true);
  assert.equal(draft.guestsCanInviteOthers, true);
  assert.equal(draft.guestsCanSeeOtherGuests, false);
  assert.equal(draft.includeGoogleMeet, false);
  assert.deepEqual(draft.guests, [
    {
      key: "guest-1",
      name: "Existing Guest",
      email: "guest@example.com",
      isKnownParticipant: false,
    },
  ]);
});

test("createCalendarEventDraft normalizes meridiem meeting times", () => {
  assert.deepEqual(
    createCalendarEventDraft({
      title: "Afternoon planning",
      date: "2026-07-08",
      startTime: "2:05 PM",
      endTime: "3:15 pm",
    }),
    {
      title: "",
      date: "2026-07-08",
      startTime: "14:05",
      endTime: "15:15",
      inviteGuests: true,
      guestsCanInviteOthers: false,
      guestsCanSeeOtherGuests: true,
      includeGoogleMeet: true,
      guests: [],
    },
  );
});

test("normalizeCalendarTime accepts hour-only meridiem times from meeting notes", () => {
  assert.equal(normalizeCalendarTime("2 PM"), "14:00");
  assert.equal(normalizeCalendarTime("11am"), "11:00");
  assert.equal(normalizeCalendarTime("12 AM"), "00:00");
});

test("createCalendarEventDraft leaves missing times empty for user entry", () => {
  assert.deepEqual(
    createCalendarEventDraft({
      title: "Untimed planning",
      date: "2026-07-08",
      participants: [
        { accountId: "abc-123", displayName: "Sayed Touati", email: "sayed@example.com" },
        { accountId: "def-456", displayName: "Iheb Touati" },
      ],
    }),
    {
      title: "",
      date: "2026-07-08",
      startTime: "",
      endTime: "",
      inviteGuests: false,
      guestsCanInviteOthers: false,
      guestsCanSeeOtherGuests: true,
      includeGoogleMeet: true,
      guests: [
        {
          key: "abc-123",
          name: "Sayed Touati",
          email: "sayed@example.com",
          isKnownParticipant: true,
        },
        {
          key: "def-456",
          name: "Iheb Touati",
          email: "",
          isKnownParticipant: true,
        },
      ],
    },
  );
});

test("validateCalendarEventDraft requires user-entered start and end times", () => {
  const draft = createCalendarEventDraft({
    title: "Untimed planning",
    date: "2026-07-08",
  });
  draft.title = "Untimed planning";

  assert.deepEqual(validateCalendarEventDraft(draft), {
    fieldErrors: {
      startTime: "Choose a start time.",
      endTime: "Choose an end time.",
    },
    guestErrors: {},
    isValid: false,
  });
});

test("buildCalendarDescription includes goals and summarized hyperlinks", () => {
  assert.equal(
    buildCalendarDescription(meetingData),
    [
      "<p><strong>MeetingFlow event brief</strong></p>",
      "<p>Created from the Confluence meeting note. Use this brief to confirm goals, timing, attendees, and supporting links before the meeting starts.</p>",
      "<ul>",
      "<li><strong>Title:</strong> Launch planning</li>",
      "<li><strong>Date:</strong> 2026-07-08</li>",
      "<li><strong>Time:</strong> 09:30 - 10:15</li>",
      "<li><strong>Participants:</strong> Sayed Touati, Iheb Touati</li>",
      "</ul>",
      "",
      "<p><strong>Goals</strong></p>",
      "<ul>",
      "<li>Confirm launch plan</li>",
      "<li>Assign follow-ups</li>",
      "</ul>",
      "",
      '<p><a href="https://example.atlassian.net/wiki/spaces/TEAM/pages/12345/Launch">Confluence meeting note</a></p>',
      "",
      "<p><strong>Related info</strong></p>",
      "<ul>",
      '<li><a href="https://drive.google.com/document/d/example">Planning doc</a></li>',
      "</ul>",
    ].join("\n"),
  );
});

test("buildCalendarDescription includes clean agenda extraction from discussion topics", () => {
  assert.equal(
    buildCalendarDescription({
      ...meetingData,
      discussionTopics: [
        {
          time: "09:30",
          topic: "Launch scope",
          presenter: { displayName: "Sayed Touati" },
          notes: ["Confirm milestone", "Name final owner"],
        },
        {
          time: "",
          topic: "Risks",
          presenter: [
            { displayName: "Iheb Touati" },
            { displayName: "Nadia Demo" },
          ],
          notes: "Capture launch blockers.",
        },
      ],
    }),
    [
      "<p><strong>MeetingFlow event brief</strong></p>",
      "<p>Created from the Confluence meeting note. Use this brief to confirm goals, timing, attendees, and supporting links before the meeting starts.</p>",
      "<ul>",
      "<li><strong>Title:</strong> Launch planning</li>",
      "<li><strong>Date:</strong> 2026-07-08</li>",
      "<li><strong>Time:</strong> 09:30 - 10:15</li>",
      "<li><strong>Participants:</strong> Sayed Touati, Iheb Touati</li>",
      "</ul>",
      "",
      "<p><strong>Goals</strong></p>",
      "<ul>",
      "<li>Confirm launch plan</li>",
      "<li>Assign follow-ups</li>",
      "</ul>",
      "",
      "<p><strong>Agenda</strong></p>",
      "<ul>",
      "<li><strong>09:30:</strong> Launch scope - Sayed Touati<br>Confirm milestone<br>Name final owner</li>",
      "<li>Risks - Iheb Touati, Nadia Demo<br>Capture launch blockers.</li>",
      "</ul>",
      "",
      '<p><a href="https://example.atlassian.net/wiki/spaces/TEAM/pages/12345/Launch">Confluence meeting note</a></p>',
      "",
      "<p><strong>Related info</strong></p>",
      "<ul>",
      '<li><a href="https://drive.google.com/document/d/example">Planning doc</a></li>',
      "</ul>",
    ].join("\n"),
  );
});

test("buildCalendarDescription escapes hyperlink labels and URLs", () => {
  assert.equal(
    buildCalendarDescription({
      title: 'Launch "plan" <draft>',
      date: "2026-07-08",
      startTime: "09:30",
      endTime: "10:15",
      participants: [{ displayName: 'Sayed "Lead" <Owner>' }],
      goals: ['Confirm "launch" <plan>'],
      pageUrl: 'https://example.com/wiki?page="one"&view=<full>',
      resources: [
        {
          title: 'Spec & "notes"',
          url: 'https://example.com/spec?draft="yes"&owner=sayed',
        },
      ],
    }),
    [
      "<p><strong>MeetingFlow event brief</strong></p>",
      "<p>Created from the Confluence meeting note. Use this brief to confirm goals, timing, attendees, and supporting links before the meeting starts.</p>",
      "<ul>",
      "<li><strong>Title:</strong> Launch &quot;plan&quot; &lt;draft&gt;</li>",
      "<li><strong>Date:</strong> 2026-07-08</li>",
      "<li><strong>Time:</strong> 09:30 - 10:15</li>",
      "<li><strong>Participants:</strong> Sayed &quot;Lead&quot; &lt;Owner&gt;</li>",
      "</ul>",
      "",
      "<p><strong>Goals</strong></p>",
      "<ul>",
      "<li>Confirm &quot;launch&quot; &lt;plan&gt;</li>",
      "</ul>",
      "",
      '<p><a href="https://example.com/wiki?page=&quot;one&quot;&amp;view=&lt;full&gt;">Confluence meeting note</a></p>',
      "",
      "<p><strong>Related info</strong></p>",
      "<ul>",
      '<li><a href="https://example.com/spec?draft=&quot;yes&quot;&amp;owner=sayed">Spec &amp; &quot;notes&quot;</a></li>',
      "</ul>",
    ].join("\n"),
  );
});

test("buildCalendarDescriptionPreview shows a clean non-HTML summary", () => {
  assert.equal(
    buildCalendarDescriptionPreview(meetingData),
    [
      "MeetingFlow event brief",
      "Created from the Confluence meeting note.",
      "Title: Launch planning",
      "Date: 2026-07-08",
      "Time: 09:30 - 10:15",
      "Participants: Sayed Touati, Iheb Touati",
      "",
      "Goals",
      "- Confirm launch plan",
      "- Assign follow-ups",
      "",
      "Links",
      "Confluence meeting note: https://example.atlassian.net/wiki/spaces/TEAM/pages/12345/Launch",
      "Planning doc: https://drive.google.com/document/d/example",
    ].join("\n"),
  );
});

test("validateCalendarEventDraft requires known participant emails when invites are on", () => {
  const draft = {
    ...createCalendarEventDraft(meetingData),
    title: "Launch planning",
    inviteGuests: true,
  };

  assert.deepEqual(validateCalendarEventDraft(draft), {
    fieldErrors: {},
    guestErrors: {
      "def-456": "Add an email address or turn off guest invites.",
    },
    isValid: false,
  });
});

test("validateCalendarEventDraft ignores missing guest emails when invites are off", () => {
  const draft = {
    ...createCalendarEventDraft(meetingData),
    title: "Launch planning",
    inviteGuests: false,
  };

  assert.deepEqual(validateCalendarEventDraft(draft), {
    fieldErrors: {},
    guestErrors: {},
    isValid: true,
  });
});

test("validateCalendarEventDraft blocks invalid guest emails", () => {
  const draft = {
    ...createCalendarEventDraft(meetingData),
    title: "Launch planning",
    inviteGuests: true,
    guests: [
      {
        key: "guest-1",
        name: "External Partner",
        email: "not-an-email",
        isKnownParticipant: false,
      },
    ],
  };

  assert.deepEqual(validateCalendarEventDraft(draft), {
    fieldErrors: {},
    guestErrors: {
      "guest-1": "Enter a valid email address.",
    },
    isValid: false,
  });
});

test("validateCalendarEventDraft blocks end time before start time", () => {
  const draft = {
    ...createCalendarEventDraft(meetingData),
    title: "Launch planning",
    guests: [],
    startTime: "11:00",
    endTime: "10:00",
  };

  assert.deepEqual(validateCalendarEventDraft(draft), {
    fieldErrors: {
      endTime: "End time must be after start time.",
    },
    guestErrors: {},
    isValid: false,
  });
});

test("validateCalendarEventDraft explains invalid time formats before Google Calendar submission", () => {
  const draft = {
    ...createCalendarEventDraft(meetingData),
    title: "Launch planning",
    guests: [],
    startTime: "25:00",
    endTime: "later",
  };

  assert.deepEqual(validateCalendarEventDraft(draft), {
    fieldErrors: {
      startTime: "Enter a valid time, like 09:30 or 2:30 PM.",
      endTime: "Enter a valid time, like 10:15 or 3:30 PM.",
    },
    guestErrors: {},
    isValid: false,
  });
});

test("validateCalendarEventDraft accepts typed full-day time labels", () => {
  const draft = {
    ...createCalendarEventDraft(meetingData),
    title: "Launch planning",
    startTime: "12:00 AM",
    endTime: "11:59 PM",
    guests: [],
  };

  assert.deepEqual(validateCalendarEventDraft(draft), {
    fieldErrors: {},
    guestErrors: {},
    isValid: true,
  });
});

test("addOrUpdateGoogleMeetResource adds a new Meet link when none exists", () => {
  assert.deepEqual(
    addOrUpdateGoogleMeetResource(meetingData, "https://meet.google.com/abc-defg-hij"),
    {
      ...meetingData,
      resources: [
        ...meetingData.resources,
        {
          title: "Google Meet",
          linkText: "link",
          url: "https://meet.google.com/abc-defg-hij",
          type: "google-meet",
        },
      ],
      relatedLinks: [
        {
          href: "https://drive.google.com/document/d/example",
          text: "Planning doc",
          linkText: "link",
          type: "link",
        },
        {
          href: "https://meet.google.com/abc-defg-hij",
          text: "Google Meet",
          linkText: "link",
          type: "google-meet",
        },
      ],
    },
  );
});

test("addOrUpdateGoogleMeetResource updates an existing Meet link without duplicates", () => {
  const meetingWithMeet = {
    ...meetingData,
    resources: [
      ...meetingData.resources,
      {
        title: "Google Meet",
        linkText: "link",
        url: "https://meet.google.com/old-link",
        type: "google-meet",
      },
    ],
  };

  const updatedMeeting = addOrUpdateGoogleMeetResource(
    meetingWithMeet,
    "https://meet.google.com/new-link",
  );

  assert.equal(
    updatedMeeting.resources.filter((resource) => resource.type === "google-meet").length,
    1,
  );
  assert.equal(
    updatedMeeting.resources.find((resource) => resource.type === "google-meet").url,
    "https://meet.google.com/new-link",
  );
});
