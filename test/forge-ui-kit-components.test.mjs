import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("meeting action CTAs use supported Forge UI Kit buttons", async () => {
  const source = await readFile("src/frontend/components/MeetingActions.jsx", "utf8");

  assert.equal(
    source.includes("Pressable"),
    false,
    "Meeting action CTAs should not use unsupported Pressable components.",
  );
});

test("calendar event modal gives the title field a helpful placeholder", async () => {
  const source = await readFile(
    "src/frontend/components/CreateCalendarEventModal.jsx",
    "utf8",
  );

  assert.equal(
    source.includes('placeholder="Enter your calendar event title"'),
    true,
    "Calendar event title should guide users when the meeting title is blank.",
  );
});

test("calendar event modal and delete modal expose supported icon buttons", async () => {
  const calendarModalSource = await readFile(
    "src/frontend/components/CreateCalendarEventModal.jsx",
    "utf8",
  );
  const deleteModalSource = await readFile(
    "src/frontend/components/DeleteMeetingModal.jsx",
    "utf8",
  );

  assert.equal(calendarModalSource.includes('icon="add"'), true);
  assert.equal(calendarModalSource.includes('icon="calendar"'), true);
  assert.equal(deleteModalSource.includes('icon="trash"'), true);
});

test("app notifies calendar event link status without deletion wording", async () => {
  const appSource = await readFile("src/frontend/App.jsx", "utf8");

  assert.equal(appSource.includes("calendarEventStatus"), true);
  assert.equal(
    appSource.includes(
      "This meeting note already has a Google Calendar event linked.",
    ),
    true,
  );
  assert.equal(
    appSource.includes(
      "No Google Calendar event is linked to this meeting note yet.",
    ),
    true,
  );
  assert.equal(
    appSource.includes("Delete the existing event before creating another one."),
    false,
  );
});

test("app shows selected note calendar status and update mode copy", async () => {
  const appSource = await readFile("src/frontend/App.jsx", "utf8");
  const selectorSource = await readFile(
    "src/frontend/components/MeetingSelector.jsx",
    "utf8",
  );
  const calendarModalSource = await readFile(
    "src/frontend/components/CreateCalendarEventModal.jsx",
    "utf8",
  );

  assert.equal(
    appSource.includes("This selected meeting note has a Google Calendar event linked."),
    true,
  );
  assert.equal(
    appSource.includes("This selected meeting note does not have a Google Calendar event linked yet."),
    true,
  );
  assert.equal(appSource.includes("updateGoogleCalendarEvent"), true);
  assert.equal(selectorSource.includes("calendarStatusMessage"), true);
  assert.equal(calendarModalSource.includes("Update calendar event"), true);
  assert.equal(calendarModalSource.includes("Update event"), true);
});

test("calendar action label follows the one-event-per-note rule", async () => {
  const appSource = await readFile("src/frontend/App.jsx", "utf8");
  const detailsSource = await readFile(
    "src/frontend/components/MeetingDetailsSection.jsx",
    "utf8",
  );
  const actionsSource = await readFile(
    "src/frontend/components/MeetingActions.jsx",
    "utf8",
  );

  assert.equal(appSource.includes("calendarEventStatus={calendarEventStatus}"), true);
  assert.equal(detailsSource.includes("calendarEventStatus"), true);
  assert.equal(actionsSource.includes("Update Calendar Event"), true);
  assert.equal(actionsSource.includes("Calendar Event Linked"), true);
});

test("meeting details show calendar time action and simplified delete modal", async () => {
  const infoCardSource = await readFile(
    "src/frontend/components/MeetingInfoCard.jsx",
    "utf8",
  );
  const deleteModalSource = await readFile(
    "src/frontend/components/DeleteMeetingModal.jsx",
    "utf8",
  );
  const selectorSource = await readFile(
    "src/frontend/components/MeetingSelector.jsx",
    "utf8",
  );

  assert.equal(infoCardSource.includes("Calendar event time"), true);
  assert.equal(infoCardSource.includes("Create calendar event"), true);
  assert.equal(infoCardSource.includes("No time extracted."), false);
  assert.equal(deleteModalSource.includes("Delete note and event"), true);
  assert.equal(deleteModalSource.includes("Delete note only"), false);
  assert.equal(deleteModalSource.includes("Archive"), false);
  assert.equal(
    selectorSource.indexOf("calendarStatusMessage") >
      selectorSource.indexOf("DatePicker"),
    true,
  );
});

test("delete modal uses one destructive action for linked calendar events", async () => {
  const deleteModalSource = await readFile(
    "src/frontend/components/DeleteMeetingModal.jsx",
    "utf8",
  );

  assert.equal(deleteModalSource.includes("Delete note and event"), true);
  assert.equal(deleteModalSource.includes("Delete note only"), false);
  assert.equal(deleteModalSource.includes("Archive"), false);
});
