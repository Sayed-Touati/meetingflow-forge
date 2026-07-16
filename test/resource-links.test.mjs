import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeMeetingResources,
  relatedLinksToResources,
  resourcesToRelatedLinks,
} from "../src/features/meeting-notes/resource-links.mjs";

test("resourcesToRelatedLinks keeps linked resource metadata", () => {
  assert.deepEqual(
    resourcesToRelatedLinks([
      {
        title: "Google Meet",
        linkText: "link",
        url: "https://meet.google.com/example",
        type: "google-meet",
      },
      {
        title: "Parking lot",
        url: "",
      },
    ]),
    [
      {
        href: "https://meet.google.com/example",
        text: "Google Meet",
        linkText: "link",
        type: "google-meet",
      },
    ],
  );
});

test("normalizeMeetingResources falls back to legacy relatedLinks", () => {
  const relatedLinks = [
    {
      href: "https://example.com/spec",
      text: "Spec",
      linkText: "read",
      type: "link",
    },
  ];

  assert.deepEqual(relatedLinksToResources(relatedLinks), [
    {
      title: "Spec",
      linkText: "read",
      url: "https://example.com/spec",
      type: "link",
    },
  ]);
  assert.deepEqual(normalizeMeetingResources({ relatedLinks }), [
    {
      title: "Spec",
      linkText: "read",
      url: "https://example.com/spec",
      type: "link",
    },
  ]);
});
