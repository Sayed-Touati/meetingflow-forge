# MeetingFlow

MeetingFlow is an Atlassian Forge app for Confluence that turns structured meeting notes into downstream meeting workflow automation.

The long-term goal is simple:

1. Detect when a Confluence meeting note is created or updated.
2. Read the meeting note content.
3. Extract useful meeting data such as title, date, participants, goals, topics, and related links.
4. Create a Google Calendar event.
5. Send a Slack summary message.
6. Store processing state so the app can avoid duplicate work.

The app is being built incrementally. The current milestone focuses only on the Confluence trigger and page inspection layer.

## Current Status

The Forge app currently:

- listens for Confluence page created and updated events,
- fetches page metadata and storage-format body content by page ID,
- inspects the `sourceTemplateEntityId` field to identify Atlassian Meeting Notes pages,
- logs body structure and heading information for parser discovery,
- documents findings in milestone walkthroughs under `docs/`.

Google Calendar, Slack, and durable processing state are intentionally not implemented yet.

## Project Structure

```text
.
|-- docs/
|   |-- milestone_1.md
|   |-- milestone_2.md
|   `-- milestone_3.md
|-- src/
|   |-- frontend/
|   |-- resolvers/
|   `-- index.js
|-- manifest.yml
|-- package.json
|-- package-lock.json
`-- MeetingFlow_Project.md
```

`src/index.js` contains the active Forge trigger handler for the current backend workflow.

`src/frontend/` and `src/resolvers/` still contain template code from the Forge starter and are not the focus of the current trigger milestone.

## Forge App Configuration

The app is configured for Confluence page events:

```yaml
modules:
  trigger:
    - key: meeting-note-page-updated
      function: handle-page-event
      events:
        - avi:confluence:created:page
        - avi:confluence:updated:page
```

The current scopes are limited to reading Confluence page summary/content data needed for inspection:

```yaml
permissions:
  scopes:
    - read:confluence-content.summary
    - read:page:confluence
```

## Development Workflow

Use small milestone commits:

```text
edit locally
forge lint
forge deploy --non-interactive --e development
test in Confluence
forge logs -e development --since 15m
commit with a clear prefix
push to GitHub
```

Recommended commit prefixes:

- `feat:` for product behavior,
- `fix:` for bug fixes,
- `docs:` for documentation,
- `chore:` for maintenance,
- `refactor:` for structure-only code changes.

## Useful Commands

Run Forge lint from the app root:

```powershell
forge lint
```

Deploy to development:

```powershell
forge deploy --non-interactive --e development
```

View recent development logs:

```powershell
forge logs -e development --since 15m
```

## Documentation

The milestone walkthroughs explain how the app reached the current state:

- `docs/milestone_1.md`: initial trigger setup,
- `docs/milestone_2.md`: clean event logging,
- `docs/milestone_3.md`: page body inspection and Meeting Notes parser findings.

## Next Milestone

The next milestone should focus on structured meeting data extraction:

1. Extract the meeting date from Confluence storage-format `<time>` tags.
2. Convert heading sections into a stable object.
3. Parse text sections such as goals and brainstorm notes.
4. Investigate Confluence mention tags for participant extraction.
5. Inspect discussion topic tables.

Keep integrations out until the extracted meeting data shape is stable.
