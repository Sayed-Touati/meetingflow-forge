import test from "node:test";
import assert from "node:assert/strict";

import {
  getMessageAutoDismissMs,
  MESSAGE_AUTO_DISMISS_MS,
} from "../src/frontend/message-timing.mjs";

test("getMessageAutoDismissMs returns a delay only for visible messages", () => {
  assert.equal(getMessageAutoDismissMs("Meeting details refreshed."), MESSAGE_AUTO_DISMISS_MS);
  assert.equal(getMessageAutoDismissMs(""), 0);
  assert.equal(getMessageAutoDismissMs("   "), 0);
});
