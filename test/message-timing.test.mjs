import test from "node:test";
import assert from "node:assert/strict";

import {
  getMessageAutoDismissMs,
} from "../src/frontend/utils/message-timing.mjs";

test("getMessageAutoDismissMs returns a delay only for visible messages", () => {
  assert.equal(getMessageAutoDismissMs("Meeting details refreshed."), 6000);
  assert.equal(getMessageAutoDismissMs(""), 0);
  assert.equal(getMessageAutoDismissMs("   "), 0);
});
