# Milestone 7: Optional Date Filter

## Goal

Milestone 7 fixes the first-page dropdown behavior.

Users should be able to see meeting notes without selecting a date. The date picker is a filter, not a required field.

## Root Cause

The initial page previously selected today's date automatically. That meant the meeting dropdown only loaded notes for today. If the extracted meeting note belonged to another date, the dropdown looked empty.

## What Changed

The meeting note dropdown now loads all indexed meeting notes by default.

The date picker is optional:

- blank date means show every extracted meeting note,
- selecting a date filters the dropdown,
- `Clear date filter` removes the filter and reloads all notes.

The storage layer now keeps an all-notes index at:

```text
meeting-note-index:all
```

Existing prototype data still falls back to `latest-meeting-data`, so old stored notes can appear before a new Confluence page update rebuilds the index.

## Validation

Validation commands:

```powershell
npm test
npm run lint
forge lint
```

All three commands passed before committing the milestone.
