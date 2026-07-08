import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("meeting action CTAs use supported Forge UI Kit buttons", async () => {
  const source = await readFile("src/frontend/components/MeetingActions.jsx", "utf8");

  assert.equal(
    source.includes("Pressable"),
    false,
    "Meeting action CTAs should not use unsupported Pressable components.",
  );
});
