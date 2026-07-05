# MeetingFlow Project Context

MeetingFlow is an Atlassian Forge app for Confluence.

## Product goal

When a user publishes a structured meeting note in Confluence:

1. The Forge app detects the page event.
2. The app reads the meeting information from the page.
3. The app creates a Google Calendar event.
4. The Calendar event invites the meeting participants.
5. The app sends a Slack message containing:
   - meeting title
   - date and time
   - meeting/Calendar link
   - Confluence meeting-note URL

## Main workflow

Confluence Meeting Note
→ Publish
→ Forge Trigger
→ Parse Meeting Data
→ Validate Data
→ Create Google Calendar Event
→ Send Slack Message
→ Save Processing State

## Current technology

- Atlassian Forge
- Confluence Cloud
- Node.js 22
- Google Calendar API
- Slack API
- Forge Storage

## Important development approach

We are building a prototype incrementally.

Do not implement the full application at once.

We will work feature by feature and make technical decisions as we progress.

The first milestone is only:

Confluence page event
→ Forge trigger
→ log the event data

After that works, we will continue to:

- fetch the page;
- parse meeting information;
- integrate Google Calendar;
- integrate Slack;
- add duplicate prevention.

## Coding rules

- Inspect the existing repository before changing files.
- Do not refactor unrelated code.
- Do not add Google Calendar or Slack until requested.
- Keep changes small and explain what was changed.
- Prefer simple prototype code over premature architecture.
- Never hard-code secrets.
