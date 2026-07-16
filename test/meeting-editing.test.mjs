import test from "node:test";
import assert from "node:assert/strict";

import {
  getEditableInputValue,
} from "../src/frontend/features/meeting-notes/meeting-editing.mjs";

test("editable input helper reads text from Forge change events", () => {
  const event = {
    target: {
      value: "Confirm launch plan",
    },
  };

  assert.equal(getEditableInputValue(event), "Confirm launch plan");
});

test("editable input helper handles display values and primitive values", () => {
  assert.equal(getEditableInputValue({ displayName: "Sayed Touati" }), "Sayed Touati");
  assert.equal(getEditableInputValue({ title: "Launch plan" }), "Launch plan");
  assert.equal(getEditableInputValue(["Launch", "Plan"]), "Launch; Plan");
  assert.equal(getEditableInputValue(false), "false");
});
