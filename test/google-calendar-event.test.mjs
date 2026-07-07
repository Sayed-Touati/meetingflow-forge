import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGoogleCalendarEventBody,
  extractGoogleCalendarEventLinks,
} from "../src/google-calendar-event.mjs";

const draft = {
  title: "Launch planning",
  date: "2026-07-08",
  startTime: "09:30",
  endTime: "10:15",
  inviteGuests: true,
  guestsCanInviteOthers: false,
  guestsCanSeeOtherGuests: true,
  includeGoogleMeet: true,
  guests: [
    { key: "one", name: "Sayed Touati", email: "SAYED@example.com" },
    { key: "two", name: "Iheb Touati", email: "iheb@example.com" },
  ],
};

test("buildGoogleCalendarEventBody creates event payload with attendees and Meet request", () => {
  assert.deepEqual(
    buildGoogleCalendarEventBody({
      draft,
      description: "Goals:\n- Confirm launch plan",
      requestId: "meetingflow-12345",
      timeZone: "UTC",
    }),
    {
      summary: "Launch planning",
      description: "Goals:\n- Confirm launch plan",
      start: {
        dateTime: "2026-07-08T09:30:00",
        timeZone: "UTC",
      },
      end: {
        dateTime: "2026-07-08T10:15:00",
        timeZone: "UTC",
      },
      attendees: [
        { email: "sayed@example.com", displayName: "Sayed Touati" },
        { email: "iheb@example.com", displayName: "Iheb Touati" },
      ],
      guestsCanInviteOthers: false,
      guestsCanModify: false,
      guestsCanSeeOtherGuests: true,
      conferenceData: {
        createRequest: {
          requestId: "meetingflow-12345",
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
    },
  );
});

test("buildGoogleCalendarEventBody omits attendees and conference data when disabled", () => {
  const body = buildGoogleCalendarEventBody({
    draft: {
      ...draft,
      inviteGuests: false,
      includeGoogleMeet: false,
    },
    description: "",
    requestId: "meetingflow-12345",
    timeZone: "UTC",
  });

  assert.equal("attendees" in body, false);
  assert.equal("conferenceData" in body, false);
});

test("buildGoogleCalendarEventBody keeps full-day ranges as timed events", () => {
  const body = buildGoogleCalendarEventBody({
    draft: {
      ...draft,
      startTime: "12:00 AM",
      endTime: "11:59 PM",
      guests: [],
    },
    description: "",
    requestId: "meetingflow-12345",
    timeZone: "UTC",
  });

  assert.deepEqual(body.start, {
    dateTime: "2026-07-08T00:00:00",
    timeZone: "UTC",
  });
  assert.deepEqual(body.end, {
    dateTime: "2026-07-08T23:59:00",
    timeZone: "UTC",
  });
});

test("extractGoogleCalendarEventLinks reads htmlLink and Meet entry point", () => {
  assert.deepEqual(
    extractGoogleCalendarEventLinks({
      id: "event-123",
      htmlLink: "https://calendar.google.com/calendar/event?eid=abc",
      conferenceData: {
        entryPoints: [
          {
            entryPointType: "video",
            uri: "https://meet.google.com/abc-defg-hij",
          },
        ],
      },
    }),
    {
      eventId: "event-123",
      eventUrl: "https://calendar.google.com/calendar/event?eid=abc",
      meetUrl: "https://meet.google.com/abc-defg-hij",
    },
  );
});
