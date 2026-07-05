# Milestone 6: Initial Page Layout

## Goal

Milestone 6 focuses only on the first state of the MeetingFlow interface.

This is the screen users see before they select a meeting note.

## What Changed

The top of the global page now follows the intended flow:

1. App title: `MeetingFlow`.
2. Clickable information icon beside the title.
3. Short welcome message explaining the purpose of the app.
4. Meeting note dropdown labeled `Meeting note page`.
5. Date picker labeled `Select date`.

The information icon opens an inline app explanation. The copy clarifies that MeetingFlow does not create meeting notes; it reviews existing Confluence meeting notes and prepares the meeting-link workflow.

## Interaction

The first state now keeps the screen quiet:

- users pick a meeting note from the dropdown,
- users filter the dropdown by date,
- meeting action buttons stay hidden until a meeting note is selected.

The existing selected-meeting workflow remains available after a user selects a meeting note.

## Validation

Validation commands:

```powershell
npm test
npm run lint
forge lint
```

All three commands passed before committing the milestone.
