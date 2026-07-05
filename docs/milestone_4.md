# Milestone 4: Structured Meeting Note Extraction

## Goal

Milestone 4 turns the earlier raw section preview into a structured meeting note object that the future confirmation UI can use directly.

The app still keeps the prototype simple. It does not create calendar events yet. The purpose of this milestone is to make the extracted data reliable enough for a dropdown-driven confirmation screen.

## What Changed

The extraction logic now lives in `src/meeting-parser.mjs`.

The parser reads Confluence storage-format markup with `htmlparser2` instead of relying on large regular expressions. This is important because Confluence meeting notes use XML-like tags for mentions, links, tables, and dates.

The parser now returns:

```js
{
  pageId,
  title,
  date,
  pageUrl,
  participants,
  goals,
  discussionTopics,
  relatedLinks,
  sections
}
```

## Extracted Fields

The parser supports these structured fields:

- `participants`: Confluence mention links with account IDs and display names.
- `goals`: bullet/list items from the Goals section.
- `discussionTopics`: rows from the Discussion topics table, including time, topic, presenter, and notes.
- `relatedLinks`: anchor links from Related info, with Google Meet links marked as `google-meet`.
- `sections`: cleaned raw section previews for fallback display and debugging.

## Storage Changes

The storage logic now lives in `src/meeting-storage.mjs`.

When a meeting note is detected, the app saves:

- `latest-meeting-data`: kept for the existing prototype UI.
- `meeting-note:<pageId>`: the full structured meeting note.
- `meeting-note-index:<date>`: a lightweight list for the future date picker and meeting dropdown.

This keeps the current UI working while preparing the app for multiple meeting notes.

## Validation

This milestone added Node test coverage for:

- structured parsing from Confluence storage markup,
- indexed meeting-note storage behavior.

Validation commands:

```powershell
npm test
npm run lint
forge lint
```

All three commands passed before committing the milestone.

## Next Milestone

Milestone 5 should update the UI and resolver to use the new indexed data:

1. Add a date picker initialized to today.
2. Load meeting-note summaries for the selected date.
3. Show a dropdown of matching meeting notes.
4. Disable confirmation actions until a meeting note is selected.
5. Display the selected structured meeting note in a cleaner confirmation layout.
