export const AUTOMATION_DEFAULT_SETTINGS = {
  autoCreateCalendarEvent: true,
  autoNotifySlack: true,
};

const AUTOMATION_SETTINGS_KEY = "automation-settings";

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

function getParticipantEmail(participant) {
  return cleanText(participant?.email || participant?.emailAddress);
}

function getParticipantLabel(participant, index) {
  if (typeof participant === "string") {
    return cleanText(participant) || `Participant ${index + 1}`;
  }

  return (
    cleanText(participant?.displayName) ||
    cleanText(participant?.name) ||
    cleanText(participant?.accountId) ||
    cleanText(participant?.userKey) ||
    cleanText(participant?.username) ||
    `Participant ${index + 1}`
  );
}

function getMissingParticipantEmails(participants = []) {
  return participants
    .filter((participant) => !getParticipantEmail(participant))
    .map(getParticipantLabel);
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
  const missingParticipantEmails = getMissingParticipantEmails(meetingData.participants);
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
