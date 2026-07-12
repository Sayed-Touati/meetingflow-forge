import React, { useEffect, useMemo, useState } from "react";
import {
    Inline,
    SectionMessage,
    Spinner,
    Stack,
    Text,
} from "@forge/react";
import { invoke, router } from "@forge/bridge";
import {
    AUTOMATION_DEFAULT_SETTINGS,
    createAutomationSettingsDraft,
} from "../automation-settings.mjs";
import {
    createCalendarEventDraft,
    validateCalendarEventDraft,
} from "../calendar-event-form.mjs";
import { createCalendarEventStatus } from "../meeting-storage.mjs";
import AutomationSettingsDrawer from "./components/AutomationSettingsDrawer";
import AppHeader from "./components/AppHeader";
import CreateCalendarEventModal from "./components/CreateCalendarEventModal";
import DeleteMeetingModal from "./components/DeleteMeetingModal";
import MeetingDetailsSection from "./components/MeetingDetailsSection";
import MeetingSelector from "./components/MeetingSelector";
import { getEditableInputValue } from "./meeting-editing.mjs";
import { getMessageAutoDismissMs } from "./message-timing.mjs";

function getConfluenceEditUrl({ pageId, pageUrl }) {
    if (!pageUrl) {
        return "";
    }

    try {
        const url = new URL(pageUrl);
        const pageIdFromUrl = pageId || url.pathname.match(/\/pages\/([^/]+)/)?.[1];
        const pathPrefix = url.pathname.match(/^(.*\/pages\/)(?:[^/]+)(?:\/.*)?$/)?.[1];

        if (!pageIdFromUrl || !pathPrefix) {
            return pageUrl;
        }

        url.pathname = `${pathPrefix}edit-v2/${pageIdFromUrl}`;
        url.search = "";
        url.hash = "";

        return url.toString();
    } catch (error) {
        return pageUrl;
    }
}

function getGoogleCalendarAutomationAppearance(status) {
    if (status === "ready") {
        return "success";
    }

    if (status === "needs-review") {
        return "warning";
    }

    return "info";
}

function getGoogleCalendarAutomationTitle(status) {
    if (status === "ready") {
        return "Google Calendar automation ready";
    }

    if (status === "needs-review") {
        return "Google Calendar automation needs review";
    }

    return "Google Calendar automation";
}

export default function App() {
    const [selectedDate, setSelectedDate] = useState("");
    const [meetingSummaries, setMeetingSummaries] = useState([]);
    const [selectedMeetingId, setSelectedMeetingId] = useState("");
    const [selectedMeetingData, setSelectedMeetingData] = useState(null);
    const [editableMeetingData, setEditableMeetingData] = useState(null);
    const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);
    const [isLoadingMeeting, setIsLoadingMeeting] = useState(false);
    const [calendarMessage, setCalendarMessage] = useState("");
    const [calendarMessageAppearance, setCalendarMessageAppearance] =
        useState("info");
    const [isAppInfoVisible, setIsAppInfoVisible] = useState(false);
    const [isDetailsVisible, setIsDetailsVisible] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
    const [calendarModalMode, setCalendarModalMode] = useState("create");
    const [calendarEventDraft, setCalendarEventDraft] = useState(null);
    const [calendarFieldErrors, setCalendarFieldErrors] = useState({});
    const [calendarGuestErrors, setCalendarGuestErrors] = useState({});
    const [calendarErrorMessage, setCalendarErrorMessage] = useState("");
    const [isRefreshingMeeting, setIsRefreshingMeeting] = useState(false);
    const [isRemovingMeeting, setIsRemovingMeeting] = useState(false);
    const [isCreatingCalendarEvent, setIsCreatingCalendarEvent] = useState(false);
    const [automationSettings, setAutomationSettings] = useState(
        AUTOMATION_DEFAULT_SETTINGS,
    );
    const [automationSettingsDraft, setAutomationSettingsDraft] = useState(
        AUTOMATION_DEFAULT_SETTINGS,
    );
    const [isAutomationSettingsOpen, setIsAutomationSettingsOpen] =
        useState(false);

    const meetingOptions = useMemo(
        () =>
            meetingSummaries.map((meeting) => ({
                label: `${meeting.title || "Untitled meeting note"}${
                    meeting.hasCalendarEvent ? " - Calendar linked" : ""
                }`,
                value: meeting.pageId,
            })),
        [meetingSummaries],
    );
    const selectedMeetingSummary = useMemo(
        () =>
            meetingSummaries.find((meeting) => meeting.pageId === selectedMeetingId) ??
            null,
        [meetingSummaries, selectedMeetingId],
    );
    const selectedMeetingOption = useMemo(
        () =>
            meetingOptions.find((meeting) => meeting.value === selectedMeetingId) ?? null,
        [meetingOptions, selectedMeetingId],
    );

    const showCalendarMessage = (message, appearance = "info") => {
        setCalendarMessage(message);
        setCalendarMessageAppearance(appearance);
    };

    const clearCalendarMessage = () => {
        showCalendarMessage("");
    };

    const loadAutomationSettings = async () => {
        try {
            const savedSettings = await invoke("getAutomationSettings");

            setAutomationSettings(createAutomationSettingsDraft(savedSettings));
            setAutomationSettingsDraft(createAutomationSettingsDraft(savedSettings));
        } catch (error) {
            showCalendarMessage(
                "MeetingFlow could not load automation settings. Defaults are shown.",
                "warning",
            );
        }
    };

    const loadMeetingSummaries = async (date) => {
        setIsLoadingMeetings(true);
        clearCalendarMessage();

        const summaries = await invoke("listMeetingNotesForDate", { date });

        setMeetingSummaries(summaries ?? []);
        setSelectedMeetingId("");
        setSelectedMeetingData(null);
        setEditableMeetingData(null);
        setIsLoadingMeetings(false);
        setIsDetailsVisible(true);
        setIsDeleteModalOpen(false);
        setIsCalendarModalOpen(false);
        setCalendarEventDraft(null);
    };

    const loadSelectedMeeting = async (pageId) => {
        if (!pageId) {
            setSelectedMeetingId("");
            setSelectedMeetingData(null);
            setEditableMeetingData(null);
            setIsDeleteModalOpen(false);
            setIsCalendarModalOpen(false);
            setCalendarEventDraft(null);
            return;
        }

        setIsLoadingMeeting(true);
        setSelectedMeetingId(pageId);
        clearCalendarMessage();

        const meetingData = await invoke("getMeetingNote", { pageId });

        setSelectedMeetingData(meetingData);
        setEditableMeetingData(meetingData);
        setIsLoadingMeeting(false);
        setIsDetailsVisible(true);
    };

    const openCalendarEventModal = () => {
        const calendarEventStatus = createCalendarEventStatus(displayedMeetingData);

        if (calendarEventStatus.hasCalendarEvent) {
            if (!calendarEventStatus.canDeleteCalendarEvent) {
                showCalendarMessage(
                    "This meeting note already has a Google Calendar event linked. Because the event has already started, MeetingFlow will not create another event or update it.",
                    "warning",
                );
                return;
            }

            setCalendarEventDraft(
                createCalendarEventDraft(displayedMeetingData, { mode: "update" }),
            );
            setCalendarFieldErrors({});
            setCalendarGuestErrors({});
            setCalendarErrorMessage("");
            setCalendarModalMode("update");
            showCalendarMessage(
                "This meeting note already has a Google Calendar event linked. Opening update mode so this note keeps one calendar event.",
                "warning",
            );
            setIsCalendarModalOpen(true);
            return;
        }

        setCalendarEventDraft(createCalendarEventDraft(displayedMeetingData));
        setCalendarFieldErrors({});
        setCalendarGuestErrors({});
        setCalendarErrorMessage("");
        setCalendarModalMode("create");
        showCalendarMessage(
            "No Google Calendar event is linked to this meeting note yet.",
            "info",
        );
        setIsCalendarModalOpen(true);
    };

    const updateCalendarDraft = (fieldName, value) => {
        setCalendarEventDraft((currentDraft) => ({
            ...currentDraft,
            [fieldName]:
                typeof value === "boolean" ? value : getEditableInputValue(value),
        }));
        setCalendarFieldErrors((currentErrors) => {
            const { [fieldName]: removedError, ...nextErrors } = currentErrors;

            return nextErrors;
        });
    };

    const updateCalendarGuest = (guestIndex, fieldName, value) => {
        const guestKey = calendarEventDraft?.guests?.[guestIndex]?.key ?? "";

        setCalendarEventDraft((currentDraft) => {
            const guests = [...(currentDraft.guests ?? [])];

            guests[guestIndex] = {
                ...guests[guestIndex],
                [fieldName]: getEditableInputValue(value),
            };

            return {
                ...currentDraft,
                guests,
            };
        });

        if (guestKey) {
            setCalendarGuestErrors((currentErrors) => {
                const { [guestKey]: removedError, ...nextErrors } = currentErrors;

                return nextErrors;
            });
        }
    };

    const addCalendarGuest = () => {
        setCalendarEventDraft((currentDraft) => ({
            ...currentDraft,
            guests: [
                ...(currentDraft.guests ?? []),
                {
                    key: `guest-${Date.now()}`,
                    name: "",
                    email: "",
                    isKnownParticipant: false,
                },
            ],
        }));
    };

    const removeCalendarGuest = (guestIndex) => {
        setCalendarEventDraft((currentDraft) => ({
            ...currentDraft,
            guests: (currentDraft.guests ?? []).filter(
                (guest, index) => index !== guestIndex,
            ),
        }));
    };

    const createCalendarEvent = async () => {
        const validation = validateCalendarEventDraft(calendarEventDraft);

        setCalendarFieldErrors(validation.fieldErrors);
        setCalendarGuestErrors(validation.guestErrors);
        setCalendarErrorMessage("");

        if (!validation.isValid) {
            setCalendarErrorMessage("Review the highlighted calendar event fields.");
            return;
        }

        setIsCreatingCalendarEvent(true);

        try {
            const resolverName =
                calendarModalMode === "update"
                    ? "updateGoogleCalendarEvent"
                    : "createGoogleCalendarEvent";
            const result = await invoke(resolverName, {
                meetingData: displayedMeetingData,
                calendarDraft: calendarEventDraft,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
            });

            if (!result?.success) {
                if (result?.type === "duplicate-calendar-event") {
                    const savedMeetingData = result.meetingData ?? displayedMeetingData;

                    setSelectedMeetingData(savedMeetingData);
                    setEditableMeetingData(savedMeetingData);
                    showCalendarMessage(
                        result.message ||
                            "This meeting note already has a Google Calendar event linked.",
                        "warning",
                    );
                    setIsCalendarModalOpen(false);
                    return;
                }

                if (result?.validation) {
                    setCalendarFieldErrors(result.validation.fieldErrors ?? {});
                    setCalendarGuestErrors(result.validation.guestErrors ?? {});
                }

                setCalendarErrorMessage(
                    result?.message ||
                        "MeetingFlow could not create the Calendar event.",
                );
                return;
            }

            const savedMeetingData = result.meetingData ?? displayedMeetingData;

            setSelectedMeetingData(savedMeetingData);
            setEditableMeetingData(savedMeetingData);
            setMeetingSummaries((currentSummaries) =>
                currentSummaries.map((meeting) =>
                    meeting.pageId === savedMeetingData.pageId
                        ? {
                              ...meeting,
                              title: savedMeetingData.title,
                              date: savedMeetingData.date,
                              pageUrl: savedMeetingData.pageUrl,
                              hasCalendarEvent: Boolean(
                                  savedMeetingData.calendarEvent?.eventId,
                              ),
                          }
                        : meeting,
                ),
            );
            showCalendarMessage(
                result.message ||
                    (calendarModalMode === "update"
                        ? "Linked Google Calendar event updated."
                        : "Calendar event created."),
                result.partialSuccess ? "warning" : "success",
            );
            setIsCalendarModalOpen(false);
        } catch (error) {
            setCalendarErrorMessage(
                "MeetingFlow could not create the Calendar event. Google Calendar may not be connected or configured yet.",
            );
        } finally {
            setIsCreatingCalendarEvent(false);
        }
    };

    const handleDateChange = (date) => {
        const nextDate = date ?? "";

        setSelectedDate(nextDate);
        loadMeetingSummaries(nextDate);
    };

    const clearDateFilter = () => {
        setSelectedDate("");
        loadMeetingSummaries("");
    };

    const clearRemovedMeeting = (removedPageId) => {
        setMeetingSummaries((currentSummaries) =>
            currentSummaries.filter((meeting) => meeting.pageId !== removedPageId),
        );
        setSelectedMeetingId("");
        setSelectedMeetingData(null);
        setEditableMeetingData(null);
        setIsDetailsVisible(true);
    };

    const refreshSelectedMeetingDetails = async () => {
        if (!displayedMeetingData?.pageId) {
            return;
        }

        setIsRefreshingMeeting(true);
        clearCalendarMessage();

        try {
            const refreshedMeetingData = await invoke("refreshMeetingNote", {
                pageId: displayedMeetingData.pageId,
            });

            if (!refreshedMeetingData) {
                showCalendarMessage(
                    "MeetingFlow could not refresh this Confluence meeting note.",
                    "warning",
                );
                return;
            }

            setSelectedMeetingData(refreshedMeetingData);
            setEditableMeetingData(refreshedMeetingData);
            setMeetingSummaries((currentSummaries) =>
                currentSummaries.map((meeting) =>
                    meeting.pageId === refreshedMeetingData.pageId
                        ? {
                              ...meeting,
                              title: refreshedMeetingData.title,
                              date: refreshedMeetingData.date,
                              pageUrl: refreshedMeetingData.pageUrl,
                              hasCalendarEvent: Boolean(
                                  refreshedMeetingData.calendarEvent?.eventId,
                              ),
                          }
                        : meeting,
                ),
            );
            showCalendarMessage("Meeting details refreshed from Confluence.", "success");
        } catch (error) {
            showCalendarMessage(
                "MeetingFlow could not refresh this meeting note. Please try again.",
                "error",
            );
        } finally {
            setIsRefreshingMeeting(false);
        }
    };

    const openDeleteMeetingModal = () => {
        const calendarEventStatus = createCalendarEventStatus(displayedMeetingData);

        if (calendarEventStatus.canDeleteCalendarEvent) {
            showCalendarMessage(
                "This meeting has a future Google Calendar event. Choose whether to delete only the note or delete the Calendar event too.",
                "warning",
            );
        }

        setIsDeleteModalOpen(true);
    };

    const removeSelectedMeeting = async (operation, options = {}) => {
        const resolverName =
            operation === "archive" ? "archiveMeetingNote" : "deleteMeetingNote";
        const successMessage =
            operation === "archive"
                ? "Meeting note archived in Confluence and removed from MeetingFlow."
                : options.deleteCalendarEvent
                  ? "Meeting note and Google Calendar event deleted."
                  : "Meeting note deleted in Confluence and removed from MeetingFlow.";

        setIsRemovingMeeting(true);

        try {
            const result = await invoke(resolverName, {
                meetingData: displayedMeetingData,
                deleteCalendarEvent: Boolean(options.deleteCalendarEvent),
            });

            if (result?.success === false) {
                showCalendarMessage(
                    result.message ||
                        "MeetingFlow could not complete this deletion. Please try again.",
                    "warning",
                );
                return;
            }

            clearRemovedMeeting(result?.pageId ?? displayedMeetingData.pageId);
            showCalendarMessage(successMessage, "success");
            setIsDeleteModalOpen(false);
        } catch (error) {
            showCalendarMessage(
                operation === "archive"
                    ? "MeetingFlow could not archive this Confluence page. Please try again."
                    : "MeetingFlow could not delete this Confluence page. Please try again.",
                "error",
            );
        } finally {
            setIsRemovingMeeting(false);
        }
    };

    const openSelectedMeetingInConfluenceEditor = () => {
        const editPageUrl = getConfluenceEditUrl({
            pageId: displayedMeetingData?.pageId,
            pageUrl: displayedMeetingData?.pageUrl,
        });

        if (editPageUrl) {
            router.open(editPageUrl);
        }
    };

    const openSelectedMeetingInConfluence = () => {
        if (displayedMeetingData?.pageUrl) {
            router.open(displayedMeetingData.pageUrl);
        }
    };

    const toggleMeetingDetails = () => {
        if (isDetailsVisible) {
            clearCalendarMessage();
        }

        setIsDetailsVisible((currentValue) => !currentValue);
    };

    const openAutomationSettings = () => {
        setAutomationSettingsDraft(createAutomationSettingsDraft(automationSettings));
        setIsAutomationSettingsOpen(true);
    };

    const updateAutomationSettingsDraft = (fieldName, value) => {
        setAutomationSettingsDraft((currentSettings) =>
            createAutomationSettingsDraft({
                ...currentSettings,
                [fieldName]: value,
            }),
        );
    };

    const cancelAutomationSettings = () => {
        setAutomationSettingsDraft(createAutomationSettingsDraft(automationSettings));
        setIsAutomationSettingsOpen(false);
    };

    const saveAutomationSettings = async () => {
        const nextSettings = createAutomationSettingsDraft(automationSettingsDraft);

        try {
            const savedSettings = await invoke("saveAutomationSettings", {
                settings: nextSettings,
            });

            setAutomationSettings(createAutomationSettingsDraft(savedSettings));
            setAutomationSettingsDraft(createAutomationSettingsDraft(savedSettings));
            showCalendarMessage("Automation settings saved.", "success");
            setIsAutomationSettingsOpen(false);
        } catch (error) {
            showCalendarMessage(
                "MeetingFlow could not save automation settings. Please try again.",
                "error",
            );
        }
    };

    useEffect(() => {
        loadMeetingSummaries(selectedDate);
        loadAutomationSettings();
    }, []);

    useEffect(() => {
        const autoDismissMs = getMessageAutoDismissMs(calendarMessage);

        if (!autoDismissMs) {
            return undefined;
        }

        const timeoutId = setTimeout(() => {
            clearCalendarMessage();
        }, autoDismissMs);

        return () => clearTimeout(timeoutId);
    }, [calendarMessage]);

    const displayedMeetingData = editableMeetingData ?? selectedMeetingData;
    const hasSelectedMeeting = Boolean(displayedMeetingData);
    const calendarEventStatus = createCalendarEventStatus(displayedMeetingData);
    const selectedMeetingHasCalendarEvent = hasSelectedMeeting
        ? calendarEventStatus.hasCalendarEvent
        : Boolean(selectedMeetingSummary?.hasCalendarEvent);
    const selectedMeetingCalendarMessage = selectedMeetingId
        ? selectedMeetingHasCalendarEvent
            ? "This selected meeting note has a Google Calendar event linked."
            : "This selected meeting note does not have a Google Calendar event linked yet."
        : "";
    const selectedMeetingCalendarAppearance = selectedMeetingHasCalendarEvent
        ? "success"
        : "info";
    const googleCalendarAutomationStatus =
        displayedMeetingData?.automation?.googleCalendar;
    const shouldShowGoogleCalendarAutomationStatus =
        googleCalendarAutomationStatus?.status === "needs-review";

    return (
        <Stack space="space.300">
            <AppHeader
                isInfoVisible={isAppInfoVisible}
                onCloseInfo={() => setIsAppInfoVisible(false)}
                onOpenAutomationSettings={openAutomationSettings}
                onToggleInfo={() => setIsAppInfoVisible((isVisible) => !isVisible)}
            />

            <MeetingSelector
                isLoadingMeetings={isLoadingMeetings}
                calendarStatusAppearance={selectedMeetingCalendarAppearance}
                calendarStatusMessage={selectedMeetingCalendarMessage}
                meetingOptions={meetingOptions}
                onClearDate={clearDateFilter}
                onDateChange={handleDateChange}
                onMeetingChange={loadSelectedMeeting}
                selectedDate={selectedDate}
                selectedMeetingOption={selectedMeetingOption}
            />

            {isLoadingMeetings || isLoadingMeeting ? (
                <Inline space="space.100" alignBlock="center">
                    <Spinner />
                    <Text>Loading meeting notes...</Text>
                </Inline>
            ) : null}

            {!isLoadingMeetings && meetingSummaries.length === 0 ? (
                <SectionMessage appearance="warning" title="No meeting notes found">
                    <Text>
                        No extracted meeting notes are available
                        {selectedDate ? ` for ${selectedDate}` : ""}. Update a Confluence
                        Meeting Notes page so MeetingFlow can index it, then refresh.
                    </Text>
                </SectionMessage>
            ) : null}

            {!hasSelectedMeeting && meetingSummaries.length > 0 ? (
                <SectionMessage appearance="info" title="Select a meeting note">
                    <Text>
                        Meeting details and actions appear after a meeting note is selected.
                    </Text>
                </SectionMessage>
            ) : null}

            {hasSelectedMeeting ? (
                <MeetingDetailsSection
                    calendarEventStatus={calendarEventStatus}
                    calendarMessage={calendarMessage}
                    calendarMessageAppearance={calendarMessageAppearance}
                    isDetailsVisible={isDetailsVisible}
                    isRefreshing={isRefreshingMeeting}
                    meetingData={displayedMeetingData}
                    onCreateCalendarEvent={openCalendarEventModal}
                    onDelete={openDeleteMeetingModal}
                    onEditInConfluence={openSelectedMeetingInConfluenceEditor}
                    onOpenConfluence={openSelectedMeetingInConfluence}
                    onRefresh={refreshSelectedMeetingDetails}
                    onToggleDetails={toggleMeetingDetails}
                />
            ) : null}

            {shouldShowGoogleCalendarAutomationStatus ? (
                <SectionMessage
                    appearance={getGoogleCalendarAutomationAppearance(
                        googleCalendarAutomationStatus.status,
                    )}
                    title={getGoogleCalendarAutomationTitle(
                        googleCalendarAutomationStatus.status,
                    )}
                >
                    <Stack space="space.100">
                        <Text>{googleCalendarAutomationStatus.message}</Text>
                        {googleCalendarAutomationStatus.missingFields?.length ? (
                            <Text>
                                Missing fields:{" "}
                                {googleCalendarAutomationStatus.missingFields.join(", ")}
                            </Text>
                        ) : null}
                        {googleCalendarAutomationStatus.missingParticipantEmails
                            ?.length ? (
                            <Text>
                                Missing participant emails:{" "}
                                {googleCalendarAutomationStatus.missingParticipantEmails.join(
                                    ", ",
                                )}
                            </Text>
                        ) : null}
                    </Stack>
                </SectionMessage>
            ) : null}

            {!hasSelectedMeeting && calendarMessage ? (
                <SectionMessage appearance={calendarMessageAppearance}>
                    <Text>{calendarMessage}</Text>
                </SectionMessage>
            ) : null}

            {hasSelectedMeeting && isDeleteModalOpen ? (
                <DeleteMeetingModal
                    isRemoving={isRemovingMeeting}
                    canDeleteCalendarEvent={calendarEventStatus.canDeleteCalendarEvent}
                    meetingTitle={displayedMeetingData.title}
                    onCancel={() => setIsDeleteModalOpen(false)}
                    onDelete={() => removeSelectedMeeting("delete")}
                    onDeleteCalendarEvent={() =>
                        removeSelectedMeeting("delete", {
                            deleteCalendarEvent: true,
                        })
                    }
                />
            ) : null}

            {hasSelectedMeeting && isCalendarModalOpen && calendarEventDraft ? (
                <CreateCalendarEventModal
                    calendarErrorMessage={calendarErrorMessage}
                    draft={calendarEventDraft}
                    fieldErrors={calendarFieldErrors}
                    guestErrors={calendarGuestErrors}
                    isCreating={isCreatingCalendarEvent}
                    meetingData={displayedMeetingData}
                    mode={calendarModalMode}
                    onAddGuest={addCalendarGuest}
                    onCancel={() => setIsCalendarModalOpen(false)}
                    onCreate={createCalendarEvent}
                    onRemoveGuest={removeCalendarGuest}
                    onUpdateDraft={updateCalendarDraft}
                    onUpdateGuest={updateCalendarGuest}
                />
            ) : null}

            {isAutomationSettingsOpen ? (
                <AutomationSettingsDrawer
                    draftSettings={automationSettingsDraft}
                    onCancel={cancelAutomationSettings}
                    onSave={saveAutomationSettings}
                    onUpdateDraftSetting={updateAutomationSettingsDraft}
                />
            ) : null}
        </Stack>
    );
}
