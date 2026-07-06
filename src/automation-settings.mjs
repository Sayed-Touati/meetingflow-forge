export const AUTOMATION_DEFAULT_SETTINGS = {
  autoCreateCalendarEvent: true,
  autoNotifySlack: true,
};

export function createAutomationSettingsDraft(settings = {}) {
  return {
    autoCreateCalendarEvent:
      settings.autoCreateCalendarEvent ??
      AUTOMATION_DEFAULT_SETTINGS.autoCreateCalendarEvent,
    autoNotifySlack:
      settings.autoNotifySlack ?? AUTOMATION_DEFAULT_SETTINGS.autoNotifySlack,
  };
}
