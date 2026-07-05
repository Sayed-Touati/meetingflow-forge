# Milestone 9: On-Demand Meeting Notes Sync

## Goal

Milestone 9 fixes the dropdown data source.

The meeting selector should not depend only on Confluence page update triggers. When the global page loads or the date filter changes, MeetingFlow now searches Confluence for pages, fetches candidate pages, filters to real Meeting Notes template pages, parses them, and updates the meeting-note indexes.

## What Changed

The resolver now calls `syncMeetingNotesFromConfluence` before reading the dropdown index.

The sync flow:

1. Search recent Confluence pages with CQL.
2. Fetch each candidate page body and metadata.
3. Keep only pages whose `sourceTemplateEntityId` matches Atlassian's Meeting Notes template.
4. Parse the meeting note date from the page body.
5. If a date filter is selected, keep only matching meeting dates.
6. Save matching meeting notes into the all-notes and date-specific indexes.

## Scope Change

The Confluence search REST API requires the `search:confluence` scope.

This milestone adds:

```yaml
- search:confluence
```

Because this is a scope change, the app must be deployed and then installed with `--upgrade`.

## Validation

Validation commands:

```powershell
npm test
npm run lint
forge lint
```

All three commands passed before committing the milestone.
