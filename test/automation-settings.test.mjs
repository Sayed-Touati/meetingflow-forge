import test from "node:test";
import assert from "node:assert/strict";

import {
  AUTOMATION_DEFAULT_SETTINGS,
  createAutomationSettingsDraft,
} from "../src/automation-settings.mjs";

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
