import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";
import { kvs } from "@forge/kvs";
import {
  addOrUpdateGoogleMeetResource,
  buildCalendarDescription,
  validateCalendarEventDraft,
} from "../calendar-event-form.mjs";
import {
  createGoogleCalendarAutomationStatus,
  getAutomationSettings,
  saveAutomationSettings,
} from "../automation-settings.mjs";
import {
  buildGoogleCalendarEventBody,
  extractGoogleCalendarEventLinks,
} from "../google-calendar-event.mjs";
import {
  refreshMeetingNoteFromConfluence,
  syncMeetingNotesFromConfluence,
} from "../meeting-note-sync.mjs";
import { updateConfluenceMeetingNotePage } from "../meeting-confluence-update.mjs";
import {
  archiveConfluenceMeetingNotePage,
  deleteConfluenceMeetingNotePage,
} from "../meeting-confluence-removal.mjs";
import {
  getMeetingNoteRecord,
  listMeetingNotesForDate,
  removeMeetingNoteRecord,
  saveMeetingNoteRecord,
} from "../meeting-storage.mjs";

const resolver = new Resolver();
const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

function addMeetingAutomationStatus(meetingNote, automationSettings) {
  return {
    ...meetingNote,
    automation: {
      googleCalendar: createGoogleCalendarAutomationStatus(
        meetingNote,
        automationSettings,
      ),
    },
  };
}

resolver.define("listMeetingNotesForDate", async (req) => {
  const date = req.payload?.date;
  const automationSettings = await getAutomationSettings(kvs);

  await syncMeetingNotesFromConfluence({
    date,
    fetchPage: (pageId) =>
      api
        .asUser()
        .requestConfluence(route`/wiki/api/v2/pages/${pageId}?body-format=storage`),
    kvsClient: kvs,
    fetchUser: (accountId) =>
      api
        .asUser()
        .requestConfluence(route`/wiki/rest/api/user?accountId=${accountId}`),
    searchPages: ({ cql, limit }) =>
      api
        .asUser()
        .requestConfluence(route`/wiki/rest/api/search?cql=${cql}&limit=${limit}`),
    prepareMeetingNote: (meetingNote) =>
      addMeetingAutomationStatus(meetingNote, automationSettings),
  });

  return listMeetingNotesForDate(kvs, date);
});

resolver.define("getMeetingNote", async (req) => {
  return getMeetingNoteRecord(kvs, req.payload?.pageId);
});

resolver.define("refreshMeetingNote", async (req) => {
  const pageId = req.payload?.pageId;
  const automationSettings = await getAutomationSettings(kvs);

  return refreshMeetingNoteFromConfluence({
    pageId,
    fetchPage: (pageIdToFetch) =>
      api
        .asUser()
        .requestConfluence(
          route`/wiki/api/v2/pages/${pageIdToFetch}?body-format=storage`,
        ),
    fetchUser: (accountId) =>
      api
        .asUser()
        .requestConfluence(route`/wiki/rest/api/user?accountId=${accountId}`),
    kvsClient: kvs,
    prepareMeetingNote: (meetingNote) =>
      addMeetingAutomationStatus(meetingNote, automationSettings),
  });
});

resolver.define("getAutomationSettings", async () => {
  return getAutomationSettings(kvs);
});

resolver.define("saveAutomationSettings", async (req) => {
  return saveAutomationSettings(kvs, req.payload?.settings);
});

function getMeetingDataPayload(req) {
  const meetingData = req.payload?.meetingData;

  if (!meetingData?.pageId) {
    throw new Error("No meeting page provided.");
  }

  return meetingData;
}

function createCalendarRequestId(meetingData) {
  return `meetingflow-${meetingData.pageId || "event"}-${Date.now()}`;
}

async function readRequiredJsonResponse(response, description) {
  if (!response.ok) {
    const message = `MeetingFlow failed to ${description}.`;
    const responseText = await response.text();

    console.log(message, {
      status: response.status,
      statusText: response.statusText,
      responseText,
    });

    throw new Error(`${message} ${responseText}`);
  }

  return response.json();
}

async function saveMeetingDataToConfluenceAndKvs(meetingData) {
  const savedMeetingData = meetingData.pageId
    ? await updateConfluenceMeetingNotePage({
        meetingData,
        fetchPage: (pageId) =>
          api
            .asUser()
            .requestConfluence(route`/wiki/api/v2/pages/${pageId}?body-format=storage`),
        updatePage: (pageId, body) =>
          api.asUser().requestConfluence(route`/wiki/api/v2/pages/${pageId}`, {
            method: "PUT",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }),
      })
    : meetingData;

  await saveMeetingNoteRecord(kvs, savedMeetingData);

  return savedMeetingData;
}

resolver.define("createGoogleCalendarEvent", async (req) => {
  const meetingData = req.payload?.meetingData;
  const calendarDraft = req.payload?.calendarDraft;
  const timeZone = req.payload?.timeZone || "UTC";

  if (!meetingData) {
    return {
      success: false,
      message: "No meeting data provided.",
    };
  }

  const validation = validateCalendarEventDraft(calendarDraft);

  if (!validation.isValid) {
    return {
      success: false,
      type: "validation",
      validation,
      message: "Review the highlighted calendar event fields.",
    };
  }

  const googleCalendar = api.asUser().withProvider("google", "google-apis");

  if (!(await googleCalendar.hasCredentials([GOOGLE_CALENDAR_SCOPE]))) {
    await googleCalendar.requestCredentials([GOOGLE_CALENDAR_SCOPE]);

    return {
      success: false,
      type: "auth",
      message: "Connect Google Calendar before creating the event.",
    };
  }

  const eventBody = buildGoogleCalendarEventBody({
    draft: calendarDraft,
    description: buildCalendarDescription(meetingData),
    requestId: createCalendarRequestId(meetingData),
    timeZone,
  });
  const calendarResponse = await googleCalendar.fetch(
    "/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
    },
  );
  let calendarEvent;

  try {
    calendarEvent = await readRequiredJsonResponse(
      calendarResponse,
      "create Google Calendar event",
    );
  } catch (error) {
    return {
      success: false,
      type: "calendar-api",
      message:
        "Google Calendar rejected the event request. Check Forge logs for the Google error details.",
    };
  }
  const calendarLinks = extractGoogleCalendarEventLinks(calendarEvent);

  if (!calendarDraft.includeGoogleMeet || !calendarLinks.meetUrl) {
    return {
      success: true,
      calendarEvent: calendarLinks,
      meetingData,
      message: "Calendar event created.",
    };
  }

  const meetingDataWithMeetLink = addOrUpdateGoogleMeetResource(
    meetingData,
    calendarLinks.meetUrl,
  );

  try {
    const savedMeetingData = await saveMeetingDataToConfluenceAndKvs(
      meetingDataWithMeetLink,
    );

    return {
      success: true,
      calendarEvent: calendarLinks,
      meetingData: savedMeetingData,
      message: "Calendar event created and meeting note updated.",
    };
  } catch (error) {
    console.log(
      "MeetingFlow created the Calendar event but could not update Confluence.",
      {
        pageId: meetingData.pageId,
        eventId: calendarLinks.eventId,
      },
    );

    return {
      success: true,
      partialSuccess: true,
      calendarEvent: calendarLinks,
      meetingData: meetingDataWithMeetLink,
      message:
        "Calendar event created, but MeetingFlow could not update the Confluence meeting note.",
    };
  }
});

resolver.define("archiveMeetingNote", async (req) => {
  const meetingData = getMeetingDataPayload(req);

  await archiveConfluenceMeetingNotePage({
    pageId: meetingData.pageId,
    archivePages: (body) =>
      api.asUser().requestConfluence(route`/wiki/rest/api/content/archive`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }),
  });
  await removeMeetingNoteRecord(kvs, meetingData);

  return {
    success: true,
    pageId: meetingData.pageId,
    message: "Meeting note archived.",
  };
});

resolver.define("deleteMeetingNote", async (req) => {
  const meetingData = getMeetingDataPayload(req);

  await deleteConfluenceMeetingNotePage({
    pageId: meetingData.pageId,
    deletePage: (pageId) =>
      api
        .asUser()
        .requestConfluence(route`/wiki/api/v2/pages/${pageId}`, {
          method: "DELETE",
        }),
  });
  await removeMeetingNoteRecord(kvs, meetingData);

  return {
    success: true,
    pageId: meetingData.pageId,
    message: "Meeting note deleted.",
  };
});

export const handler = resolver.getDefinitions();
