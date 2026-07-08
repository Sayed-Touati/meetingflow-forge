export const AUTOMATION_DEFAULT_SETTINGS = {
  autoCreateCalendarEvent: true,
  autoNotifySlack: true,
};

export const AUTOMATION_SETTINGS_KEY = "automation-settings";

export function createAutomationSettingsDraft(settings = {}) {
  return {
    autoCreateCalendarEvent:
      settings.autoCreateCalendarEvent ??
      AUTOMATION_DEFAULT_SETTINGS.autoCreateCalendarEvent,
    autoNotifySlack:
      settings.autoNotifySlack ?? AUTOMATION_DEFAULT_SETTINGS.autoNotifySlack,
  };
}

export async function getAutomationSettings(kvsClient) {
  const savedSettings = await kvsClient.get(AUTOMATION_SETTINGS_KEY);

  return createAutomationSettingsDraft(savedSettings);
}

export async function saveAutomationSettings(kvsClient, settings) {
  const normalizedSettings = createAutomationSettingsDraft(settings);

  await kvsClient.set(AUTOMATION_SETTINGS_KEY, normalizedSettings);

  return normalizedSettings;
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function getParticipantLabel(participant) {
  if (Array.isArray(participant)) {
    return participant.map(getParticipantLabel).filter(Boolean).join(", ");
  }

  if (typeof participant === "string") {
    return participant;
  }

  return participant?.displayName || participant?.name || participant?.email || "";
}

function hasParticipantEmail(participant) {
  if (Array.isArray(participant)) {
    return participant.every(hasParticipantEmail);
  }

  return Boolean(cleanText(participant?.email || participant?.emailAddress));
}

export function createGoogleCalendarAutomationStatus(meetingData = {}, settings = {}) {
  const normalizedSettings = createAutomationSettingsDraft(settings);

  if (!normalizedSettings.autoCreateCalendarEvent) {
    return {
      type: "google-calendar",
      status: "disabled",
      message: "Google Calendar automation is turned off.",
      missingFields: [],
      missingParticipantEmails: [],
    };
  }

  const requiredFields = ["title", "date", "startTime", "endTime"];
  const missingFields = requiredFields.filter((fieldName) => !cleanText(meetingData[fieldName]));
  const missingParticipantEmails = (meetingData.participants ?? [])
    .filter((participant) => !hasParticipantEmail(participant))
    .map(getParticipantLabel)
    .filter(Boolean);
  const needsReview = missingFields.length > 0 || missingParticipantEmails.length > 0;

  return {
    type: "google-calendar",
    status: needsReview ? "needs-review" : "ready",
    message: needsReview
      ? "Google Calendar automation needs review before this meeting can be created."
      : "Google Calendar automation is ready. Open MeetingFlow to review and create the event.",
    missingFields,
    missingParticipantEmails,
  };
}
