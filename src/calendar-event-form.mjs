function cleanText(value) {
  return String(value ?? "").trim();
}

export function normalizeCalendarTime(value) {
  const match = cleanText(value).match(/^(\d{1,2}):(\d{2})(?:\s*([ap])\.?m\.?)?$/i);

  if (!match) {
    return cleanText(value);
  }

  const [, hourText, minuteText, meridiem] = match;
  let hour = Number(hourText);
  const minute = Number(minuteText);

  if (minute > 59 || hour > 23 || (meridiem && hour > 12)) {
    return "";
  }

  if (meridiem) {
    hour %= 12;

    if (meridiem.toLowerCase() === "p") {
      hour += 12;
    }
  }

  return `${String(hour).padStart(2, "0")}:${minuteText}`;
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

function getDefaultedCalendarTime(value, fallback) {
  return normalizeCalendarTime(value) || fallback;
}

function isSupportedCalendarTime(value) {
  const cleanedValue = cleanText(value);
  const hasSupportedShape = /^(\d{1,2}):(\d{2})(?:\s*([ap])\.?m\.?)?$/i.test(cleanedValue);

  return hasSupportedShape && Boolean(normalizeCalendarTime(cleanedValue));
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanText(value));
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

export function createCalendarEventDraft(meetingData = {}) {
  const guests = (meetingData.participants ?? []).map((participant, index) => ({
    key: getPersonKey(participant, index),
    name: getPersonName(participant),
    email: getPersonEmail(participant),
    isKnownParticipant: true,
  }));

  return {
    title: cleanText(meetingData.title),
    date: cleanText(meetingData.date),
    startTime: getDefaultedCalendarTime(meetingData.startTime, "12:00 AM"),
    endTime: getDefaultedCalendarTime(meetingData.endTime, "11:59 PM"),
    inviteGuests: guests.every((guest) => Boolean(cleanText(guest.email))),
    guestsCanInviteOthers: false,
    guestsCanSeeOtherGuests: true,
    includeGoogleMeet: true,
    guests,
  };
}

export function buildCalendarDescription(meetingData = {}) {
  const lines = [];
  const goals = (meetingData.goals ?? []).map(cleanText).filter(Boolean);
  const resources = (meetingData.resources ?? []).filter((resource) => resource?.url);

  if (goals.length) {
    lines.push("Goals:");
    goals.forEach((goal) => lines.push(`- ${goal}`));
  }

  if (meetingData.pageUrl) {
    if (lines.length) {
      lines.push("");
    }

    lines.push("Confluence meeting note:");
    lines.push(meetingData.pageUrl);
  }

  if (resources.length) {
    if (lines.length) {
      lines.push("");
    }

    lines.push("Related info:");
    resources.forEach((resource) => {
      lines.push(`- ${cleanText(resource.title) || "Link"}: ${resource.url}`);
    });
  }

  return lines.join("\n");
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
