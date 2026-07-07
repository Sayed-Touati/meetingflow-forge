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
import AutomationSettingsDrawer from "./components/AutomationSettingsDrawer";
import AppHeader from "./components/AppHeader";
import EditMeetingModal from "./components/EditMeetingModal";
import MeetingDetailsSection from "./components/MeetingDetailsSection";
import MeetingSelector from "./components/MeetingSelector";
import {
    getEditableInputValue,
    parseListText,
    parseParticipantsText,
    parseRelatedInfoText,
    relatedLinksFromResources,
} from "./meeting-editing.mjs";

function getGoogleMeetLink(meetingData) {
    const googleMeetResource = meetingData?.resources?.find(
        (resource) => resource.type === "google-meet",
    );

    if (googleMeetResource) {
        return {
            href: googleMeetResource.url,
            text: googleMeetResource.title,
            type: googleMeetResource.type,
        };
    }

    return meetingData?.relatedLinks?.find((link) => link.type === "google-meet");
}

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

export default function App() {
    const [selectedDate, setSelectedDate] = useState("");
    const [meetingSummaries, setMeetingSummaries] = useState([]);
    const [selectedMeetingData, setSelectedMeetingData] = useState(null);
    const [editableMeetingData, setEditableMeetingData] = useState(null);
    const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);
    const [isLoadingMeeting, setIsLoadingMeeting] = useState(false);
    const [calendarMessage, setCalendarMessage] = useState("");
    const [isAppInfoVisible, setIsAppInfoVisible] = useState(false);
    const [isDetailsVisible, setIsDetailsVisible] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSavingMeeting, setIsSavingMeeting] = useState(false);
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
                label: meeting.title || "Untitled meeting note",
                value: meeting.pageId,
            })),
        [meetingSummaries],
    );

    const loadMeetingSummaries = async (date) => {
        setIsLoadingMeetings(true);
        setCalendarMessage("");

        const summaries = await invoke("listMeetingNotesForDate", { date });

        setMeetingSummaries(summaries ?? []);
        setSelectedMeetingData(null);
        setEditableMeetingData(null);
        setIsLoadingMeetings(false);
        setIsDetailsVisible(true);
        setIsEditModalOpen(false);
    };

    const loadSelectedMeeting = async (pageId) => {
        if (!pageId) {
            setSelectedMeetingData(null);
            setEditableMeetingData(null);
            setIsEditModalOpen(false);
            return;
        }

        setIsLoadingMeeting(true);
        setCalendarMessage("");

        const meetingData = await invoke("getMeetingNote", { pageId });

        setSelectedMeetingData(meetingData);
        setEditableMeetingData(meetingData);
        setIsLoadingMeeting(false);
        setIsDetailsVisible(true);
    };

    const previewCalendarEvent = () => {
        const googleMeetLink = getGoogleMeetLink(editableMeetingData);

        setCalendarMessage(
            googleMeetLink
                ? `Ready to create a calendar event for "${editableMeetingData.title}" using ${googleMeetLink.href}.`
                : `Ready to create a calendar event for "${editableMeetingData.title}". No Google Meet link was extracted yet.`,
        );
    };

    const updateMeetingField = (fieldName, value) => {
        setEditableMeetingData((currentMeetingData) => ({
            ...currentMeetingData,
            [fieldName]: getEditableInputValue(value),
        }));
    };

    const updateGoals = (value) => {
        setEditableMeetingData((currentMeetingData) => ({
            ...currentMeetingData,
            goals: parseListText(value),
        }));
    };

    const updateBrainstorm = (value) => {
        setEditableMeetingData((currentMeetingData) => ({
            ...currentMeetingData,
            brainstorm: parseListText(value),
        }));
    };

    const updateParticipants = (value) => {
        setEditableMeetingData((currentMeetingData) => ({
            ...currentMeetingData,
            participants: parseParticipantsText(value),
        }));
    };

    const updateRelatedInfo = (value) => {
        setEditableMeetingData((currentMeetingData) => {
            const resources = parseRelatedInfoText(value);

            return {
                ...currentMeetingData,
                resources,
                relatedLinks: relatedLinksFromResources(resources),
            };
        });
    };

    const updateDiscussionTopicField = (topicIndex, fieldName, value) => {
        setEditableMeetingData((currentMeetingData) => {
            const discussionTopics = [...(currentMeetingData.discussionTopics ?? [])];
            const currentTopic = discussionTopics[topicIndex] ?? {};
            const fieldValue = getEditableInputValue(value);
            let nextValue = fieldValue;

            if (fieldName === "presenter") {
                const presenters = fieldValue
                    .split(",")
                    .map((presenter) => presenter.trim())
                    .filter(Boolean)
                    .map((displayName) => ({ displayName }));

                nextValue = presenters.length > 1 ? presenters : presenters[0] ?? null;
            }

            if (fieldName === "notes") {
                const noteLines = parseListText(fieldValue);

                nextValue = noteLines.length > 1 ? noteLines : noteLines[0] ?? "";
            }

            discussionTopics[topicIndex] = {
                ...currentTopic,
                [fieldName]: nextValue,
            };

            return {
                ...currentMeetingData,
                discussionTopics,
            };
        });
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

    const handleSaveModalChanges = async () => {
        setIsSavingMeeting(true);

        try {
            const result = await invoke("saveLatestMeetingData", {
                meetingData: editableMeetingData,
            });
            const savedMeetingData = result?.meetingData ?? editableMeetingData;

            setSelectedMeetingData(savedMeetingData);
            setEditableMeetingData(savedMeetingData);
            setCalendarMessage("Meeting details saved to Confluence and MeetingFlow.");
            setIsEditModalOpen(false);
        } catch (error) {
            setCalendarMessage(
                "MeetingFlow could not save these changes to Confluence. Please try again.",
            );
        } finally {
            setIsSavingMeeting(false);
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
            setCalendarMessage("");
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

    const saveAutomationSettings = () => {
        const nextSettings = createAutomationSettingsDraft(automationSettingsDraft);

        setAutomationSettings(nextSettings);
        setAutomationSettingsDraft(nextSettings);
        setIsAutomationSettingsOpen(false);
    };

    useEffect(() => {
        loadMeetingSummaries(selectedDate);
    }, []);

    const displayedMeetingData = editableMeetingData ?? selectedMeetingData;
    const hasSelectedMeeting = Boolean(displayedMeetingData);

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
                meetingOptions={meetingOptions}
                onClearDate={clearDateFilter}
                onDateChange={handleDateChange}
                onMeetingChange={loadSelectedMeeting}
                selectedDate={selectedDate}
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
                    calendarMessage={calendarMessage}
                    isDetailsVisible={isDetailsVisible}
                    meetingData={displayedMeetingData}
                    onCreateCalendarEvent={previewCalendarEvent}
                    onDelete={() => {}}
                    onEdit={() => setIsEditModalOpen(true)}
                    onEditInConfluence={openSelectedMeetingInConfluenceEditor}
                    onOpenConfluence={openSelectedMeetingInConfluence}
                    onToggleDetails={toggleMeetingDetails}
                />
            ) : null}

            {hasSelectedMeeting && isEditModalOpen ? (
                <EditMeetingModal
                    isSaving={isSavingMeeting}
                    meetingData={displayedMeetingData}
                    onCancel={() => setIsEditModalOpen(false)}
                    onSave={handleSaveModalChanges}
                    onUpdateBrainstorm={updateBrainstorm}
                    onUpdateDiscussionTopicField={updateDiscussionTopicField}
                    onUpdateField={updateMeetingField}
                    onUpdateGoals={updateGoals}
                    onUpdateParticipants={updateParticipants}
                    onUpdateRelatedInfo={updateRelatedInfo}
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
