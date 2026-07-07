import test from "node:test";
import assert from "node:assert/strict";

import {
  addOrUpdateGoogleMeetResource,
  buildCalendarDescription,
  createCalendarEventDraft,
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

test("createCalendarEventDraft pre-fills meeting values and guest rows", () => {
  assert.deepEqual(createCalendarEventDraft(meetingData), {
    title: "Launch planning",
    date: "2026-07-08",
    startTime: "09:30",
    endTime: "10:15",
    inviteGuests: true,
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

test("createCalendarEventDraft normalizes meridiem meeting times", () => {
  assert.deepEqual(
    createCalendarEventDraft({
      title: "Afternoon planning",
      date: "2026-07-08",
      startTime: "2:05 PM",
      endTime: "3:15 pm",
    }),
    {
      title: "Afternoon planning",
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

test("buildCalendarDescription includes goals, Confluence URL, and related info", () => {
  assert.equal(
    buildCalendarDescription(meetingData),
    [
      "Goals:",
      "- Confirm launch plan",
      "- Assign follow-ups",
      "",
      "Confluence meeting note:",
      "https://example.atlassian.net/wiki/spaces/TEAM/pages/12345/Launch",
      "",
      "Related info:",
      "- Planning doc: https://drive.google.com/document/d/example",
    ].join("\n"),
  );
});

test("validateCalendarEventDraft requires known participant emails when invites are on", () => {
  const draft = createCalendarEventDraft(meetingData);

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

test("validateCalendarEventDraft accepts typed full-day time labels", () => {
  const draft = {
    ...createCalendarEventDraft(meetingData),
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
