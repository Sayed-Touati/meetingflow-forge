# Google Calendar Event Creation Design

## Summary

MeetingFlow will add a real "Create Calendar Event" flow for selected Confluence meeting notes. The feature opens a modal, pre-fills event details from the selected meeting note, lets the user review and correct guest emails, creates a Google Calendar event with a Google Meet link, and updates the Confluence meeting note's Related info section with the generated Meet link.

Version 1 focuses on stable event creation and note update behavior. Participant availability checks, calendar selection, and advanced Google Meet access controls are intentionally deferred.

## Goals

- Replace the current calendar preview stub with a user-friendly creation modal.
- Pre-fill event title, date, start time, end time, goals, Confluence note URL, related links, and participant names from the meeting note.
- Invite guests by email when the user enables guest invites.
- Allow missing or incorrect participant emails to be fixed before event creation.
- Create a Google Meet link through Google Calendar event creation.
- Add the generated Meet link to the Confluence meeting note's Related info section.
- Preserve user-entered modal data when validation or API calls fail.

## Non-Goals

- Do not check participant availability in version 1.
- Do not suggest alternative common meeting times in version 1.
- Do not build a calendar selector in version 1; create events on the connected user's primary calendar.
- Do not try to manage Confluence page permissions from this flow.
- Do not require all participants to come from the Confluence meeting note; the user can add extra guests.
- Do not depend on Atlassian email lookup always succeeding.

## User Experience

The user clicks "Create Calendar Event" in the meeting actions panel. MeetingFlow opens a modal titled "Create calendar event".

The modal contains these fields:

- Title: pre-filled from the meeting note title.
- Date: pre-filled from the meeting note date.
- Start time: pre-filled from the meeting note start time.
- End time: pre-filled from the meeting note end time.
- Guests: editable rows with participant name and email.
- Add guest: adds a blank guest row.
- Invite guests: toggle, on by default.
- Guests can invite others: toggle, off by default.
- Guests can see guest list: toggle, on by default.
- Include Google Meet link: toggle, on by default.
- Description preview: generated from meeting goals, Confluence note URL, and related info links.

The footer contains Cancel and Create buttons. Create shows a loading state while the event is being created.

Guest rows should make missing email addresses obvious without blocking event creation when "Invite guests" is off. When invites are on, rows with invalid emails block creation and show row-level guidance. Known participant rows with missing emails also block creation. Blank extra guest rows are ignored.

## Participant Email Behavior

MeetingFlow currently stores Confluence participants mostly as account IDs and display names. Version 1 should try to pre-fill emails when an email is already present on a participant object or can be fetched through an allowed Atlassian user email API path. The UI must remain useful when email lookup returns nothing because Atlassian user email access can be restricted by privacy settings, site policy, or app permissions.

Each participant appears as:

- Name: display-only or editable text for manually added guests.
- Email: editable text field.

Google Calendar can invite any syntactically valid email address, including non-Gmail addresses.

## Calendar Event Data

The Google Calendar event should be created on the connected user's primary calendar.

Event fields:

- Summary: modal title.
- Start: modal date and start time.
- End: modal date and end time.
- Attendees: guest email rows when "Invite guests" is enabled.
- Description: generated text from goals, Confluence note URL, and related info.
- Conference data: create a Google Meet link when "Include Google Meet link" is enabled.
- Guest permissions:
  - guestsCanInviteOthers from modal toggle.
  - guestsCanSeeOtherGuests from modal toggle.
  - guestsCanModify should stay false in version 1.

The description should be readable in Google Calendar and include:

1. Goals
2. Confluence meeting note URL
3. Related info links

## Confluence Update

After Google Calendar successfully creates the event, MeetingFlow should add the generated Google Meet link to `meetingData.resources` as a resource with:

- title: "Google Meet"
- linkText: "link"
- url: the generated Meet URL
- type: "google-meet"

If an equivalent Google Meet resource already exists, update it instead of adding a duplicate. Then reuse the existing Confluence update path to save the modified meeting note page and the Forge KVS record.

## Error Handling

Validation errors happen before any API calls:

- Missing title blocks creation.
- Missing date blocks creation.
- Missing start or end time blocks creation.
- End time not after start time blocks creation.
- Missing known participant email blocks creation when guest invites are enabled.
- Invalid guest email blocks creation when guest invites are enabled.

API errors:

- If Google authorization is missing, show a clear message asking the user to connect Google Calendar.
- If Google Calendar event creation fails, keep the modal open and preserve all form data.
- If Calendar creation succeeds but Confluence update fails, show a partial success message with the Calendar event or Meet link and explain that the meeting note was not updated.
- If Confluence update succeeds, close the modal and show a success message.

## Architecture

Frontend additions:

- `CreateCalendarEventModal.jsx` for the modal UI.
- Calendar form helper module for defaults, validation, description generation, guest normalization, and resource update preparation.
- `App.jsx` state for opening the modal, tracking creation progress, storing success/error messages, and refreshing selected meeting data after success.

Backend additions:

- Resolver action such as `createGoogleCalendarEvent`.
- Calendar payload builder module that converts the modal payload into the Google Calendar API event body.
- Google Calendar API call through Forge external auth.
- Existing Confluence update module reused after adding or updating the Google Meet resource.

Manifest and auth changes:

- Add the minimum Forge permissions required for Google Calendar external auth and any required egress controls.
- Keep existing Confluence scopes unless a new Atlassian user email lookup scope is strictly required and supported.
- If scopes or permissions change, redeploy and reinstall the app.

## Testing

Add focused tests for non-UI behavior:

- Calendar description generation from goals, Confluence URL, and related links.
- Guest email validation and normalization.
- Calendar payload shape, including attendees, conference data, and guest permissions.
- Google Meet resource add/update behavior without duplicates.
- Partial success handling can be covered through helper-level tests if the app state logic becomes complex.

Do not add broad UI snapshot tests for this first version unless implementation complexity increases.

## Deferred Enhancements

- Participant availability checks through Google Calendar FreeBusy.
- Suggested common meeting times.
- Calendar selector for non-primary calendars.
- Advanced Google Meet access controls if the Google account and APIs support them reliably.
- More robust Atlassian participant email discovery if approved and available for the customer site.
