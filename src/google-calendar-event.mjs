import { normalizeCalendarTime } from "./calendar-event-form.mjs";

function cleanText(value) {
  return String(value ?? "").trim();
}

function getDateTime(date, time) {
  return `${date}T${normalizeCalendarTime(time)}:00`;
}

function buildAttendees(draft) {
  if (!draft.inviteGuests) {
    return [];
  }

  return (draft.guests ?? [])
    .map((guest) => ({
      email: cleanText(guest.email).toLowerCase(),
      displayName: cleanText(guest.name),
    }))
    .filter((guest) => guest.email)
    .map((guest) => ({
      email: guest.email,
      ...(guest.displayName ? { displayName: guest.displayName } : {}),
    }));
}

export function buildGoogleCalendarEventBody({
  draft,
  description,
  requestId,
  timeZone = "UTC",
}) {
  const attendees = buildAttendees(draft);
  const eventBody = {
    summary: cleanText(draft.title),
    description: cleanText(description),
    start: {
      dateTime: getDateTime(draft.date, draft.startTime),
      timeZone,
    },
    end: {
      dateTime: getDateTime(draft.date, draft.endTime),
      timeZone,
    },
    guestsCanInviteOthers: Boolean(draft.guestsCanInviteOthers),
    guestsCanModify: false,
    guestsCanSeeOtherGuests: Boolean(draft.guestsCanSeeOtherGuests),
  };

  if (attendees.length) {
    eventBody.attendees = attendees;
  }

  if (draft.includeGoogleMeet) {
    eventBody.conferenceData = {
      createRequest: {
        requestId,
        conferenceSolutionKey: {
          type: "hangoutsMeet",
        },
      },
    };
  }

  return eventBody;
}

export function extractGoogleCalendarEventLinks(event) {
  const meetEntryPoint = event?.conferenceData?.entryPoints?.find(
    (entryPoint) => entryPoint.entryPointType === "video" && entryPoint.uri,
  );

  return {
    eventId: event?.id,
    eventUrl: event?.htmlLink,
    meetUrl: meetEntryPoint?.uri,
  };
}
