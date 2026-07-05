# Milestone 3: Fetch and Inspect Meeting Note Page Content

## Goal

Milestone 3 was an investigation milestone.

The goal was to move beyond the trigger event summary and learn how Forge can read the actual Confluence meeting note page.

We wanted to answer:

- Can the app fetch page details by page ID?
- Can the app fetch the page body?
- Can the app detect that a page came from Atlassian's Meeting Notes template?
- Can the app identify meeting note sections like Date, Participants, Goals, and Discussion topics?

## Why This Milestone Matters

The trigger event tells us that a page was created or updated, but it only gives summary data.

For MeetingFlow, summary data is not enough. Eventually the app needs to extract meeting data such as:

- meeting title,
- date,
- time,
- participants,
- goals,
- discussion topics,
- related info.

To do that safely, we first needed to inspect the real Confluence page structure.

## Manifest Updates

We updated the trigger to listen to both page creation and page updates.

```yaml
modules:
  trigger:
    - key: meeting-note-page-updated
      function: handle-page-event
      events:
        - avi:confluence:created:page
        - avi:confluence:updated:page
```

This matters because the real MeetingFlow process starts when the host creates and publishes a pre-meeting note.

We also added the permission needed to fetch Confluence page details.

```yaml
permissions:
  scopes:
    - read:confluence-content.summary
    - read:page:confluence
```

`read:confluence-content.summary` is required for the Confluence page event.

`read:page:confluence` is required for the app to call the Confluence page API.

## Importing Forge API

We added Forge's backend API client in `src/index.js`.

```js
import api, { route } from "@forge/api";
```

`api` lets the backend function call Atlassian product APIs.

`route` safely builds Confluence REST API paths that include variables like `pageId`.

## Reading The Page ID

The handler receives an `event` object from Forge.

The event contains information about what happened in Confluence.

We read the page ID from the event:

```js
const pageId = event.content?.id;
```

The `?.` syntax is optional chaining. It prevents the function from crashing if `content` is missing.

We also added a safety check:

```js
if (!pageId) {
  console.log("No page ID found in the event!");
  return;
}
```

If there is no page ID, the app cannot fetch the page, so it stops early.

## Fetching Page Details

We then used the page ID to ask Confluence for the page details.

```js
const pageResponse = await api
  .asApp()
  .requestConfluence(route`/wiki/api/v2/pages/${pageId}?body-format=storage`);
```

This means:

```text
Forge app, ask Confluence for the page with this ID, including the body in storage format.
```

`asApp()` means the request is made as the Forge app.

`requestConfluence()` calls the Confluence REST API.

`body-format=storage` asks Confluence to include the page body in storage format.

## Handling Failed API Responses

We added a response check:

```js
if (!pageResponse.ok) {
  console.log("Failed to fetch page details from Confluence", {
    pageId,
    status: pageResponse.status,
    statusText: pageResponse.statusText,
  });
  return;
}
```

`pageResponse.ok` tells us whether the request succeeded.

`status` and `statusText` help us debug failures, such as:

- `403 Forbidden`,
- `404 Not Found`,
- `500 Internal Server Error`.

## Converting The Response To Page Data

After confirming the response was successful, we converted it to JSON:

```js
const page = await pageResponse.json();
```

`pageResponse` is the HTTP response.

`page` is the actual Confluence page data inside that response.

## Inspecting Returned Fields

We first logged the available fields:

```js
console.log("Fetched page fields:", Object.keys(page));
```

The logs showed fields such as:

```text
sourceTemplateEntityId
createdAt
authorId
version
body
title
id
_links
```

This confirmed that Confluence returns both page metadata and a `body` field.

## Detecting The Meeting Notes Template

The most useful metadata field was:

```text
sourceTemplateEntityId
```

For the Atlassian Meeting Notes template, the value was:

```text
com.atlassian.confluence.plugins.confluence-business-blueprints:meeting-notes-blueprint
```

This is important because it gives us a strong way to detect meeting note pages.

Instead of guessing from the title, we can later use:

```text
If sourceTemplateEntityId is meeting-notes-blueprint, treat the page as a meeting note.
```

## Inspecting Body And Links

We logged body and link information:

```js
console.log("Fetched page template/body info:", {
  sourceTemplateEntityId: page.sourceTemplateEntityId,
  bodyKeys: page.body ? Object.keys(page.body) : [],
  linkKeys: page._links ? Object.keys(page._links) : [],
});
```

Before adding `body-format=storage`, the body was empty:

```text
bodyKeys: []
```

After adding `body-format=storage`, the logs showed:

```text
bodyKeys: [ 'storage' ]
```

That confirmed we were fetching the actual page body.

## Previewing The Page Body

We logged a short preview of the storage body:

```js
console.log("Fetched page body preview:", {
  storageRepresentation: page.body?.storage?.representation,
  storageValuePreview: page.body?.storage?.value?.slice(0, 500),
});
```

The body is stored in Confluence storage format, which looks like HTML/XML.

Example:

```html
<h2>
  <ac:emoticon ac:name="calendar_spiral" />
  &nbsp;Date
</h2>
<p>
  <time datetime="2026-07-04" />
</p>
```

This taught us that the date should be parsed from the `<time datetime="...">` tag later.

## Extracting Section Headings

We then extracted the meeting note headings from the body:

```js
const storageValue = page.body?.storage?.value ?? "";

const sectionHeadings = [
  ...storageValue.matchAll(/<h2[^>]*>(.*?)<\/h2>/g),
].map((match) =>
  match[1]
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim(),
);

console.log("Meeting note section headings:", sectionHeadings);
```

The logs showed headings like:

```text
Date
Participants
Goals
Discussion topics
Action items
Decisions
```

This confirmed that the Meeting Notes template is structured around `h2` sections.

## Extracting Raw Section Previews

Next, we captured the content under each heading:

```js
const sectionMatches = [
  ...storageValue.matchAll(/<h2[^>]*>(.*?)<\/h2>(.*?)(?=<h2[^>]*>|$)/gs),
];

const sectionsByHeading = Object.fromEntries(
  sectionMatches.map((match) => {
    const heading = match[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();

    const contentPreview = match[2]
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300);

    return [heading, contentPreview];
  }),
);

console.log("Meeting note sections preview:", sectionsByHeading);
```

The logs showed raw section data such as:

```text
Date: test1 test 2 test 3 4
Goals: hello how are you am grea
Brainstorm: hello how are you am great
Discussion topics: Time Topic Presenter Notes ...
Related info: hello how are you am grea
```

This proved that heading-based section extraction works as a first parsing layer.

## Important Finding: Participants Need Special Parsing

The exported PDF showed visible participants:

```text
@Sayed Touati
@Iheb Touati
```

But our current simple text extraction returned:

```text
Participants: ''
```

This probably happens because Confluence stores user mentions as special tags, not plain text.

Simple tag stripping removes the mention tags, so participant names disappear.

We should not fix this inside Milestone 3. We should record it as a known parser requirement for the next milestone.

Later, participants should be parsed from Confluence mention tags, likely involving account IDs.

## Current Status

Milestone 3 confirmed that the app can:

1. receive Confluence page created and updated events,
2. fetch the full page record by page ID,
3. fetch the page body in storage format,
4. identify the source template,
5. detect Atlassian Meeting Notes pages using `sourceTemplateEntityId`,
6. extract section headings,
7. extract raw section previews.

## Next Milestone

Milestone 4 should focus on structured meeting data extraction.

Recommended extraction order:

1. Extract date from the `<time datetime="...">` tag.
2. Extract raw section content into a stable object.
3. Parse goals and brainstorm as plain text.
4. Investigate participant mention tags.
5. Investigate discussion topic tables.
6. Ignore action items and decisions for now because they are mostly post-meeting data.

The frontend should come after we have a stable meeting data object to display.
