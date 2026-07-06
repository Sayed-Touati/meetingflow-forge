import React, { useEffect, useMemo, useState } from "react";
import {
    Inline,
    SectionMessage,
    Spinner,
    Stack,
    Text,
} from "@forge/react";
import { invoke } from "@forge/bridge";
import AppHeader from "./components/AppHeader";
import EditMeetingModal from "./components/EditMeetingModal";
import MeetingDetailsSection from "./components/MeetingDetailsSection";
import MeetingSelector from "./components/MeetingSelector";

function getGoogleMeetLink(meetingData) {
    return meetingData?.relatedLinks?.find((link) => link.type === "google-meet");
}

function splitLines(value) {
    return value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
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
            [fieldName]: value,
        }));
    };

    const updateGoals = (value) => {
        setEditableMeetingData((currentMeetingData) => ({
            ...currentMeetingData,
            goals: splitLines(value),
        }));
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

    const handleSaveModalChanges = () => {
        setSelectedMeetingData(editableMeetingData);
        setIsEditModalOpen(false);
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
                    onToggleDetails={() =>
                        setIsDetailsVisible((currentValue) => !currentValue)
                    }
                />
            ) : null}

            {hasSelectedMeeting && isEditModalOpen ? (
                <EditMeetingModal
                    meetingData={displayedMeetingData}
                    onCancel={() => setIsEditModalOpen(false)}
                    onSave={handleSaveModalChanges}
                    onUpdateField={updateMeetingField}
                    onUpdateGoals={updateGoals}
                />
            ) : null}
        </Stack>
    );
}
