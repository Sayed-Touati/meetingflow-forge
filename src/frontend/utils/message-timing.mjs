const MESSAGE_AUTO_DISMISS_MS = 6000;

export function getMessageAutoDismissMs(message) {
  return String(message ?? "").trim() ? MESSAGE_AUTO_DISMISS_MS : 0;
}
