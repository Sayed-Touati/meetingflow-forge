# Milestone 8: Indexed Meeting Notes Only

## Goal

Milestone 8 removes the old latest-meeting fallback from the meeting selector.

The dropdown should show Confluence Meeting Notes pages that MeetingFlow has indexed, not arbitrary pages and not the last saved prototype record.

## Behavior

The meeting dropdown now uses only meeting-note indexes:

- blank date: read `meeting-note-index:all`,
- selected date: read `meeting-note-index:<date>`,
- no index: show no meeting notes.

The old `latest-meeting-data` key is ignored by the dropdown.

## Why This Matters

MeetingFlow can receive many Meeting Notes pages over time. Some days have none, some have one, and some have several.

The selector needs to represent that actual indexed set instead of pretending there is one global latest meeting.

## Validation

Validation commands:

```powershell
npm test
npm run lint
forge lint
```

All three commands passed before committing the milestone.
