# Milestone 1: Detect Confluence Page Updates

## Goal

The first milestone for MeetingFlow was to prove the basic Forge trigger flow:

```text
Confluence page update
-> Forge trigger
-> backend function
-> Forge logs
```

At this stage, the app does not read the full page body yet. It only proves that a Confluence page update can wake up our Forge function.

## Starting Point

The project started from a Forge UI Kit template. The original app looked like a standard Confluence "Hello World" app.

Important files at the start:

- `manifest.yml`: Forge app configuration.
- `src/index.js`: backend entry point.
- `src/resolvers/index.js`: default resolver from the template.
- `src/frontend/index.jsx`: default UI Kit frontend from the template.

For this milestone, we did not need the frontend. We focused on a backend trigger.

## Manifest Changes

We updated `manifest.yml` so Forge knows which app this is, what event it listens to, which function should run, and what permission scope is needed.

```yaml
app:
  id: ari:cloud:ecosystem::app/00e4214a-c469-4fcb-90ef-d1f4c9d4bbc6
  runtime:
    name: nodejs22.x

modules:
  trigger:
    - key: meeting-note-page-updated
      function: handle-page-event
      events:
        - avi:confluence:updated:page
  function:
    - key: handle-page-event
      handler: index.handlePageEvent

permissions:
  scopes:
    - read:confluence-content.summary
```

## Manifest Explanation

The `app` section identifies the Forge app and tells Forge to use the Node.js 22 runtime.

The `trigger` module tells Forge to listen for this Confluence event:

```text
avi:confluence:updated:page
```

The trigger points to a Forge function key:

```yaml
function: handle-page-event
```

The `function` module connects that key to the actual JavaScript handler:

```yaml
handler: index.handlePageEvent
```

That means Forge looks in `src/index.js` and calls the exported function named `handlePageEvent`.

The permission scope is required by Forge for this Confluence page update event:

```yaml
read:confluence-content.summary
```

## First Backend Handler

We replaced the old template entry point with a trigger handler in `src/index.js`.

```js
export async function handlePageEvent(event, context) {
  console.log("MeetingFlow received a Confluence page update event.");
  console.log("Event:", JSON.stringify(event, null, 2));
  console.log("Context:", JSON.stringify(context, null, 2));
}
```

## Handler Explanation

Forge calls `handlePageEvent` when a Confluence page update event happens.

The `event` parameter contains information about the Confluence event, such as page ID, page title, event type, and version details.

The `context` parameter contains Forge runtime information, such as the installation and cloud site context.

We used `JSON.stringify(event, null, 2)` to print the event in a readable format. This was intentionally noisy at first because we wanted to see the complete shape of the data Forge sends.

## Validation

We ran:

```powershell
forge lint
```

This checks the app for Forge configuration problems.

During this step, Forge helped us find and fix:

- the missing top-level `app` section,
- the app ID format,
- the required Confluence permission scope,
- an invalid `ignoreSelf` filter that works for Jira events but not for this Confluence event.

After those fixes, `forge lint` passed.

## Deployment

We deployed the app to the development environment:

```powershell
forge deploy --non-interactive -e development
```

This uploaded the local app code and manifest to Forge.

The `-e development` option means the app was deployed to the Forge development environment.

The `--non-interactive` option means Forge should run without stopping for terminal prompts.

## Installation

After deploying, we installed the development app into the Confluence site:

```powershell
forge install --non-interactive --site https://sayedtouatipro.atlassian.net --product confluence --environment development
```

Deploying uploads the app to Forge. Installing connects that deployed app to a real Atlassian site.

This made the trigger active on the Confluence site.

## Live Test

We created a test page:

```text
Test - 2026-07-04 Meeting notes
```

Creating the page did not trigger the app because the app listens for page updates, not page creation.

Then we edited and published the page again. That triggered the app.

We checked the logs with:

```powershell
forge logs -e development --since 15m
```

The logs included:

```text
MeetingFlow received a Confluence page update event.
```

## Result

Milestone 1 is complete.

We proved that a Confluence page update can trigger our Forge backend function and produce logs.
