function cleanText(value) {
  return String(value ?? "").trim();
}

export function normalizeCalendarTime(value) {
  const match = cleanText(value).match(/^(\d{1,2})(?::(\d{2}))?(?:\s*([ap])\.?m\.?)?$/i);

  if (!match) {
    return cleanText(value);
  }

  const [, hourText, minuteText, meridiem] = match;
  const hasMinute = typeof minuteText === "string";

  if (!hasMinute && !meridiem) {
    return cleanText(value);
  }

  let hour = Number(hourText);
  const minute = Number(minuteText ?? "00");

  if (minute > 59 || hour > 23 || (meridiem && hour > 12)) {
    return "";
  }

  if (meridiem) {
    hour %= 12;

    if (meridiem.toLowerCase() === "p") {
      hour += 12;
    }
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function getPersonKey(person, index) {
  if (typeof person === "string") {
    return person || `participant-${index}`;
  }

  return (
    person?.accountId ||
    person?.userKey ||
    person?.username ||
    person?.email ||
    person?.emailAddress ||
    person?.displayName ||
    person?.name ||
    `participant-${index}`
  );
}

function getPersonName(person) {
  if (Array.isArray(person)) {
    return person.map(getPersonName).filter(Boolean).join(", ");
  }

  if (typeof person === "string") {
    return person;
  }

  return person?.displayName || person?.name || person?.email || person?.emailAddress || "";
}

function getPersonEmail(person) {
  if (!person || Array.isArray(person) || typeof person === "string") {
    return "";
  }

  return person.email || person.emailAddress || "";
}

function isSupportedCalendarTime(value) {
  const cleanedValue = cleanText(value);
  const hasSupportedShape = /^(\d{1,2}):(\d{2})(?:\s*([ap])\.?m\.?)?$/i.test(cleanedValue);

  return hasSupportedShape && Boolean(normalizeCalendarTime(cleanedValue));
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanText(value));
}

function escapeHtml(value) {
  return cleanText(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function htmlLink(url, label) {
  return `<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`;
}

function getMeetingTimeRange(meetingData) {
  const startTime = cleanText(meetingData.startTime);
  const endTime = cleanText(meetingData.endTime);

  if (startTime && endTime) {
    return `${startTime} - ${endTime}`;
  }

  return startTime || endTime;
}

function getParticipantNames(participants = []) {
  return participants.map(getPersonName).filter(Boolean);
}

function buildSummaryItems(meetingData) {
  return [
    ["Title", meetingData.title],
    ["Date", meetingData.date],
    ["Time", getMeetingTimeRange(meetingData)],
    ["Participants", getParticipantNames(meetingData.participants).join(", ")],
  ]
    .map(([label, value]) => [label, cleanText(value)])
    .filter(([, value]) => value);
}

function getTopicPresenterNames(presenter) {
  if (!presenter) {
    return "";
  }

  return Array.isArray(presenter)
    ? presenter.map(getPersonName).filter(Boolean).join(", ")
    : getPersonName(presenter);
}

function formatTopicNotes(notes) {
  if (Array.isArray(notes)) {
    return notes.map(cleanText).filter(Boolean).join("<br>");
  }

  return cleanText(notes);
}

function buildAgendaItem(topic) {
  const topicText = cleanText(topic.topic);
  const presenterText = getTopicPresenterNames(topic.presenter);
  const notesText = formatTopicNotes(topic.notes);
  const prefix = cleanText(topic.time)
    ? `<strong>${escapeHtml(topic.time)}:</strong> `
    : "";
  const heading = [topicText, presenterText].filter(Boolean).join(" - ");
  const escapedNotes = notesText
    .split("<br>")
    .map(escapeHtml)
    .join("<br>");

  return `${prefix}${escapeHtml(heading)}${escapedNotes ? `<br>${escapedNotes}` : ""}`;
}

function getAgendaItems(discussionTopics = []) {
  return discussionTopics.map(buildAgendaItem).filter(Boolean);
}

function relatedLinksFromResources(resources) {
  return (resources ?? [])
    .filter((resource) => resource?.url)
    .map((resource) => ({
      href: resource.url,
      text: resource.title,
      ...(resource.linkText ? { linkText: resource.linkText } : {}),
      type: resource.type,
    }));
}

export function createCalendarEventDraft(meetingData = {}, options = {}) {
  return createCalendarEventDraftFromMeeting(meetingData, options);
}

function getDateFromDateTime(value) {
  return cleanText(value).split("T")[0] || "";
}

function getTimeFromDateTime(value) {
  const timeText = cleanText(value).split("T")[1]?.slice(0, 5) || "";

  return normalizeCalendarTime(timeText);
}

function createCalendarEventDraftFromMeeting(meetingData = {}, { mode = "create" } = {}) {
  const guests = (meetingData.participants ?? []).map((participant, index) => ({
    key: getPersonKey(participant, index),
    name: getPersonName(participant),
    email: getPersonEmail(participant),
    isKnownParticipant: true,
  }));
  const calendarEvent = mode === "update" ? meetingData.calendarEvent : null;
  const calendarGuests = Array.isArray(calendarEvent?.guests)
    ? calendarEvent.guests
    : guests;

  return {
    title: cleanText(calendarEvent?.title) || (calendarEvent ? cleanText(meetingData.title) : ""),
    date: getDateFromDateTime(calendarEvent?.startDateTime) || cleanText(meetingData.date),
    startTime:
      getTimeFromDateTime(calendarEvent?.startDateTime) ||
      normalizeCalendarTime(meetingData.startTime),
    endTime:
      getTimeFromDateTime(calendarEvent?.endDateTime) ||
      normalizeCalendarTime(meetingData.endTime),
    inviteGuests:
      calendarEvent?.inviteGuests ??
      calendarGuests.every((guest) => Boolean(cleanText(guest.email))),
    guestsCanInviteOthers: calendarEvent?.guestsCanInviteOthers ?? false,
    guestsCanSeeOtherGuests: calendarEvent?.guestsCanSeeOtherGuests ?? true,
    includeGoogleMeet: calendarEvent?.includeGoogleMeet ?? true,
    guests: calendarGuests,
  };
}

export function buildCalendarDescription(meetingData = {}) {
  const blocks = [];
  const summaryItems = buildSummaryItems(meetingData);
  const goals = (meetingData.goals ?? []).map(cleanText).filter(Boolean);
  const resources = (meetingData.resources ?? []).filter((resource) => resource?.url);
  const agendaItems = getAgendaItems(meetingData.discussionTopics);

  if (summaryItems.length) {
    blocks.push(
      [
        "<p><strong>MeetingFlow event brief</strong></p>",
        "<p>Created from the Confluence meeting note. Use this brief to confirm goals, timing, attendees, and supporting links before the meeting starts.</p>",
        "<ul>",
        ...summaryItems.map(
          ([label, value]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`,
        ),
        "</ul>",
      ].join("\n"),
    );
  }

  if (goals.length) {
    blocks.push(
      [
        "<p><strong>Goals</strong></p>",
        "<ul>",
        ...goals.map((goal) => `<li>${escapeHtml(goal)}</li>`),
        "</ul>",
      ].join("\n"),
    );
  }

  if (agendaItems.length) {
    blocks.push(
      [
        "<p><strong>Agenda</strong></p>",
        "<ul>",
        ...agendaItems.map((agendaItem) => `<li>${agendaItem}</li>`),
        "</ul>",
      ].join("\n"),
    );
  }

  if (meetingData.pageUrl) {
    blocks.push(`<p>${htmlLink(meetingData.pageUrl, "Confluence meeting note")}</p>`);
  }

  if (resources.length) {
    blocks.push(
      [
        "<p><strong>Related info</strong></p>",
        "<ul>",
        ...resources.map((resource) => {
          const label = cleanText(resource.title) || cleanText(resource.linkText) || "Link";

          return `<li>${htmlLink(resource.url, label)}</li>`;
        }),
        "</ul>",
      ].join("\n"),
    );
  }

  return blocks.join("\n\n");
}

export function buildCalendarDescriptionPreview(meetingData = {}) {
  const blocks = [];
  const summaryItems = buildSummaryItems(meetingData);
  const goals = (meetingData.goals ?? []).map(cleanText).filter(Boolean);
  const resources = (meetingData.resources ?? []).filter((resource) => resource?.url);
  const links = [];

  if (meetingData.pageUrl) {
    links.push(`Confluence meeting note: ${meetingData.pageUrl}`);
  }

  resources.forEach((resource) => {
    const label = cleanText(resource.title) || cleanText(resource.linkText) || "Link";

    links.push(`${label}: ${resource.url}`);
  });

  if (summaryItems.length) {
    blocks.push(
      [
        "MeetingFlow event brief",
        "Created from the Confluence meeting note.",
        ...summaryItems.map(([label, value]) => `${label}: ${value}`),
      ].join("\n"),
    );
  }

  if (goals.length) {
    blocks.push(["Goals", ...goals.map((goal) => `- ${goal}`)].join("\n"));
  }

  if (links.length) {
    blocks.push(["Links", ...links].join("\n"));
  }

  return blocks.join("\n\n");
}

export function validateCalendarEventDraft(draft = {}) {
  const fieldErrors = {};
  const guestErrors = {};
  const startTimeText = cleanText(draft.startTime);
  const endTimeText = cleanText(draft.endTime);

  if (!cleanText(draft.title)) {
    fieldErrors.title = "Add an event title.";
  }

  if (!cleanText(draft.date)) {
    fieldErrors.date = "Choose an event date.";
  }

  if (!startTimeText) {
    fieldErrors.startTime = "Choose a start time.";
  } else if (!isSupportedCalendarTime(startTimeText)) {
    fieldErrors.startTime = "Enter a valid time, like 09:30 or 2:30 PM.";
  }

  if (!endTimeText) {
    fieldErrors.endTime = "Choose an end time.";
  } else if (!isSupportedCalendarTime(endTimeText)) {
    fieldErrors.endTime = "Enter a valid time, like 10:15 or 3:30 PM.";
  }

  const startTime = normalizeCalendarTime(draft.startTime);
  const endTime = normalizeCalendarTime(draft.endTime);

  if (!fieldErrors.startTime && !fieldErrors.endTime && startTime && endTime && endTime <= startTime) {
    fieldErrors.endTime = "End time must be after start time.";
  }

  if (draft.inviteGuests) {
    (draft.guests ?? []).forEach((guest, index) => {
      const key = guest.key || `guest-${index}`;
      const email = cleanText(guest.email);
      const isBlankExtraGuest = !guest.isKnownParticipant && !cleanText(guest.name) && !email;

      if (isBlankExtraGuest) {
        return;
      }

      if (!email && guest.isKnownParticipant) {
        guestErrors[key] = "Add an email address or turn off guest invites.";
        return;
      }

      if (email && !isValidEmail(email)) {
        guestErrors[key] = "Enter a valid email address.";
      }
    });
  }

  return {
    fieldErrors,
    guestErrors,
    isValid: Object.keys(fieldErrors).length === 0 && Object.keys(guestErrors).length === 0,
  };
}

export function normalizeInvitedGuests(guests = []) {
  return guests
    .map((guest) => ({
      ...guest,
      name: cleanText(guest.name),
      email: cleanText(guest.email).toLowerCase(),
    }))
    .filter((guest) => guest.email);
}

export function addOrUpdateGoogleMeetResource(meetingData, meetUrl) {
  const googleMeetResource = {
    title: "Google Meet",
    linkText: "link",
    url: meetUrl,
    type: "google-meet",
  };
  const resources = meetingData.resources?.length
    ? meetingData.resources
    : (meetingData.relatedLinks ?? []).map((link) => ({
        title: link.text || link.href,
        linkText: link.linkText,
        url: link.href,
        type: link.type,
      }));
  let didUpdate = false;
  const nextResources = resources.map((resource) => {
    if (resource.type !== "google-meet") {
      return resource;
    }

    didUpdate = true;
    return googleMeetResource;
  });

  if (!didUpdate) {
    nextResources.push(googleMeetResource);
  }

  return {
    ...meetingData,
    resources: nextResources,
    relatedLinks: relatedLinksFromResources(nextResources),
  };
}
