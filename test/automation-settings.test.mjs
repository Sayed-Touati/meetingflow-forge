import test from "node:test";
import assert from "node:assert/strict";

import {
  AUTOMATION_DEFAULT_SETTINGS,
  createGoogleCalendarAutomationStatus,
  createAutomationSettingsDraft,
  getAutomationSettings,
  saveAutomationSettings,
} from "../src/automation-settings.mjs";

function createMemoryKvs(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));

  return {
    values,
    async get(key) {
      return values.get(key);
    },
    async set(key, value) {
      values.set(key, value);
    },
  };
}

test("AUTOMATION_DEFAULT_SETTINGS enables both supported automations", () => {
  assert.deepEqual(AUTOMATION_DEFAULT_SETTINGS, {
    autoCreateCalendarEvent: true,
    autoNotifySlack: true,
  });
});

test("createAutomationSettingsDraft keeps unsupported settings out of the saved shape", () => {
  assert.deepEqual(
    createAutomationSettingsDraft({
      autoCreateCalendarEvent: false,
      autoNotifySlack: true,
      autoCreateJiraIssue: true,
    }),
    {
      autoCreateCalendarEvent: false,
      autoNotifySlack: true,
    },
  );
});

test("getAutomationSettings returns defaults when settings have not been saved", async () => {
  assert.deepEqual(await getAutomationSettings(createMemoryKvs()), {
    autoCreateCalendarEvent: true,
    autoNotifySlack: true,
  });
});

test("saveAutomationSettings stores the normalized supported settings", async () => {
  const kvs = createMemoryKvs();

  await saveAutomationSettings(kvs, {
    autoCreateCalendarEvent: false,
    autoNotifySlack: true,
    autoCreateJiraIssue: true,
  });

  assert.deepEqual(kvs.values.get("automation-settings"), {
    autoCreateCalendarEvent: false,
    autoNotifySlack: true,
  });
});

test("createGoogleCalendarAutomationStatus reports disabled automation", () => {
  assert.deepEqual(
    createGoogleCalendarAutomationStatus(
      {
        pageId: "page-1",
        title: "Planning",
        date: "2026-07-07",
        startTime: "09:00",
        endTime: "10:00",
        participants: [{ displayName: "Sayed", email: "sayed@example.com" }],
      },
      { autoCreateCalendarEvent: false },
    ),
    {
      type: "google-calendar",
      status: "disabled",
      message: "Google Calendar automation is turned off.",
      missingFields: [],
      missingParticipantEmails: [],
    },
  );
});

test("createGoogleCalendarAutomationStatus treats missing times and participant emails as reviewable defaults", () => {
  assert.deepEqual(
    createGoogleCalendarAutomationStatus(
      {
        pageId: "page-1",
        title: "Planning",
        date: "2026-07-07",
        startTime: "",
        endTime: "",
        participants: [
          { displayName: "Sayed", email: "sayed@example.com" },
          { displayName: "Iheb", email: "" },
        ],
      },
      { autoCreateCalendarEvent: true },
    ),
    {
      type: "google-calendar",
      status: "ready",
      message:
        "Google Calendar automation is ready. Open MeetingFlow to review and create the event.",
      missingFields: [],
      missingParticipantEmails: [],
    },
  );
});

test("createGoogleCalendarAutomationStatus reports missing required identity fields", () => {
  assert.deepEqual(
    createGoogleCalendarAutomationStatus(
      {
        pageId: "page-1",
        title: "",
        date: "2026-07-07",
        startTime: "",
        endTime: "10:00",
        participants: [{ displayName: "Sayed" }, { displayName: "Iheb", email: "" }],
      },
      { autoCreateCalendarEvent: true },
    ),
    {
      type: "google-calendar",
      status: "needs-review",
      message:
        "Google Calendar automation needs review before this meeting can be created.",
      missingFields: ["title"],
      missingParticipantEmails: [],
    },
  );
});

test("createGoogleCalendarAutomationStatus reports ready automation", () => {
  assert.deepEqual(
    createGoogleCalendarAutomationStatus(
      {
        pageId: "page-1",
        title: "Planning",
        date: "2026-07-07",
        startTime: "09:00",
        endTime: "10:00",
        participants: [{ displayName: "Sayed", email: "sayed@example.com" }],
      },
      { autoCreateCalendarEvent: true },
    ),
    {
      type: "google-calendar",
      status: "ready",
      message:
        "Google Calendar automation is ready. Open MeetingFlow to review and create the event.",
      missingFields: [],
      missingParticipantEmails: [],
    },
  );
});
