import React, { useEffect, useMemo, useState } from "react";
import ForgeReconciler, {
    Badge,
    Button,
    ButtonGroup,
    DatePicker,
    DynamicTable,
    Heading,
    Icon,
    Inline,
    Label,
    Link,
    List,
    ListItem,
    Pressable,
    SectionMessage,
    Select,
    Spinner,
    Stack,
    Tag,
    TagGroup,
    Text,
    TextArea,
    Textfield,
    Tooltip,
} from "@forge/react";
import { invoke } from "@forge/bridge";

function getGoogleMeetLink(meetingData) {
    return meetingData?.relatedLinks?.find((link) => link.type === "google-meet");
}

function createTextFromList(items, formatter = (item) => item) {
    return (items ?? []).map(formatter).join("\n");
}

function splitLines(value) {
    return value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
}

function InfoHint({ text }) {
    return (
        <Tooltip text={text}>
            <Badge appearance="default">i</Badge>
        </Tooltip>
    );
}

function FieldHeader({ title, hint }) {
    return (
        <Inline space="space.050" alignBlock="center">
            <Text>{title}</Text>
            <InfoHint text={hint} />
        </Inline>
    );
}

function AppHeader({ isInfoVisible, onToggleInfo }) {
    return (
        <Stack space="space.100">
            <Inline space="space.100" alignBlock="center">
                <Heading as="h1">MeetingFlow</Heading>
                <Tooltip text="Show what this app does">
                    <Pressable onClick={onToggleInfo}>
                        <Icon
                            glyph="information-circle"
                            label="Show what this app does"
                            size="small"
                        />
                    </Pressable>
                </Tooltip>
            </Inline>

            <Text>
                Welcome back. Select a Confluence meeting note and confirm the extracted
                details before preparing the calendar handoff.
            </Text>

            {isInfoVisible ? (
                <SectionMessage appearance="info" title="About MeetingFlow">
                    <Text>
                        MeetingFlow does not create meeting notes. It reviews meeting notes
                        that already exist in Confluence, helps you confirm the extracted
                        meeting details, and prepares the meeting link workflow.
                    </Text>
                </SectionMessage>
            ) : null}
        </Stack>
    );
}

function MeetingNotePicker({
    isLoadingMeetings,
    meetingOptions,
    onClearDate,
    onDateChange,
    onMeetingChange,
    selectedDate,
}) {
    return (
        <Stack space="space.150">
            <Inline space="space.200" alignBlock="end">
                <Stack space="space.050">
                    <Label labelFor="meeting-note">Meeting note page</Label>
                    <Select
                        id="meeting-note"
                        name="meeting-note"
                        placeholder={
                            isLoadingMeetings ? "Loading meeting notes..." : "Select a meeting note"
                        }
                        options={meetingOptions}
                        isDisabled={isLoadingMeetings || meetingOptions.length === 0}
                        onChange={(option) => onMeetingChange(option?.value)}
                    />
                </Stack>
                <DatePicker
                    key={selectedDate || "all-dates"}
                    name="meeting-filter-date"
                    label="Select date"
                    description="Optional. Leave blank to show every extracted meeting note."
                    defaultValue={selectedDate || undefined}
                    onChange={onDateChange}
                />
            </Inline>

            {selectedDate ? (
                <Button appearance="subtle" icon="cross" onClick={onClearDate}>
                    Clear date filter
                </Button>
            ) : null}

            <Text>
                The dropdown shows every extracted meeting note unless you choose a date.
            </Text>
        </Stack>
    );
}

function EmptyValue({ children }) {
    return (
        <SectionMessage appearance="warning" title="Needs review">
            <Text>{children}</Text>
        </SectionMessage>
    );
}

function DiscussionTopicsTable({ topics }) {
    if (!topics?.length) {
        return (
            <EmptyValue>
                No discussion topic rows were extracted. Check the source meeting note table.
            </EmptyValue>
        );
    }

    return (
        <DynamicTable
            head={{
                cells: [
                    { key: "time", content: "Time" },
                    { key: "topic", content: "Topic" },
                    { key: "presenter", content: "Presenter" },
                    { key: "notes", content: "Notes" },
                ],
            }}
            rows={topics.map((topic, index) => ({
                key: `topic-${index}`,
                cells: [
                    { key: `time-${index}`, content: topic.time || "-" },
                    { key: `topic-${index}`, content: topic.topic || "-" },
                    { key: `presenter-${index}`, content: topic.presenter || "-" },
                    { key: `notes-${index}`, content: topic.notes || "-" },
                ],
            }))}
        />
    );
}

function RelatedLinks({ links }) {
    if (!links?.length) {
        return (
            <EmptyValue>
                No related links were extracted. Add the meeting link to the Confluence note,
                then refresh this page.
            </EmptyValue>
        );
    }

    return (
        <List>
            {links.map((link) => (
                <ListItem key={link.href}>
                    <Inline space="space.100" alignBlock="center">
                        <Link href={link.href} openNewTab>
                            {link.text || link.href}
                        </Link>
                        <Badge appearance={link.type === "google-meet" ? "primary" : "default"}>
                            {link.type === "google-meet" ? "Google Meet" : "Link"}
                        </Badge>
                    </Inline>
                </ListItem>
            ))}
        </List>
    );
}

function ConfirmationPanel({
    calendarMessage,
    displayedMeetingData,
    onUpdateField,
    onUpdateGoals,
    saveMessage,
}) {
    const googleMeetLink = getGoogleMeetLink(displayedMeetingData);

    return (
        <Stack space="space.300">
            <SectionMessage appearance="info" title="Confirm before sending">
                <Text>
                    This page is for confirming extracted meeting details and preparing the
                    meeting link handoff. Create or edit the actual meeting note in Confluence.
                </Text>
            </SectionMessage>

            <Stack space="space.100">
                <FieldHeader
                    title="Source"
                    hint="The Confluence meeting note that produced these extracted fields."
                />
                {displayedMeetingData.pageUrl ? (
                    <Link href={displayedMeetingData.pageUrl} openNewTab>
                        Open meeting note in Confluence
                    </Link>
                ) : (
                    <EmptyValue>No source page URL was found.</EmptyValue>
                )}
            </Stack>

            <Stack space="space.100">
                <FieldHeader
                    title="Meeting basics"
                    hint="These values will be used later when the calendar event is created."
                />
                <Textfield
                    name="title"
                    label="Title"
                    value={displayedMeetingData.title ?? ""}
                    onChange={(value) => onUpdateField("title", value)}
                />
                <DatePicker
                    name="meeting-date"
                    label="Meeting date"
                    defaultValue={displayedMeetingData.date}
                    onChange={(value) => onUpdateField("date", value)}
                />
            </Stack>

            <Stack space="space.100">
                <FieldHeader
                    title="Participants"
                    hint="Participants are extracted from Confluence mention tags when possible."
                />
                {displayedMeetingData.participants?.length ? (
                    <TagGroup>
                        {displayedMeetingData.participants.map((participant) => (
                            <Tag
                                key={participant.accountId}
                                text={participant.name || participant.accountId}
                                color="blue-light"
                            />
                        ))}
                    </TagGroup>
                ) : (
                    <EmptyValue>No participants were extracted yet.</EmptyValue>
                )}
            </Stack>

            <Stack space="space.100">
                <FieldHeader
                    title="Goals"
                    hint="Goals are extracted as individual list items from the Goals section."
                />
                <TextArea
                    name="goals"
                    label="Goals"
                    value={createTextFromList(displayedMeetingData.goals)}
                    onChange={onUpdateGoals}
                />
            </Stack>

            <Stack space="space.100">
                <FieldHeader
                    title="Discussion topics"
                    hint="Discussion topics come from the meeting note table: time, topic, presenter, and notes."
                />
                <DiscussionTopicsTable topics={displayedMeetingData.discussionTopics} />
            </Stack>

            <Stack space="space.100">
                <FieldHeader
                    title="Meeting links"
                    hint="Google Meet links are highlighted when they are found in Related info."
                />
                {googleMeetLink ? (
                    <SectionMessage appearance="confirmation" title="Meeting link found">
                        <Link href={googleMeetLink.href} openNewTab>
                            {googleMeetLink.text || googleMeetLink.href}
                        </Link>
                    </SectionMessage>
                ) : null}
                <RelatedLinks links={displayedMeetingData.relatedLinks} />
            </Stack>

            {saveMessage ? (
                <SectionMessage appearance="confirmation">
                    <Text>{saveMessage}</Text>
                </SectionMessage>
            ) : null}

            {calendarMessage ? (
                <SectionMessage appearance="info">
                    <Text>{calendarMessage}</Text>
                </SectionMessage>
            ) : null}
        </Stack>
    );
}

const App = () => {
    const [selectedDate, setSelectedDate] = useState("");
    const [meetingSummaries, setMeetingSummaries] = useState([]);
    const [selectedMeetingData, setSelectedMeetingData] = useState(null);
    const [editableMeetingData, setEditableMeetingData] = useState(null);
    const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);
    const [isLoadingMeeting, setIsLoadingMeeting] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");
    const [calendarMessage, setCalendarMessage] = useState("");
    const [isAppInfoVisible, setIsAppInfoVisible] = useState(false);

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
        setSaveMessage("");
        setCalendarMessage("");

        const summaries = await invoke("listMeetingNotesForDate", { date });

        setMeetingSummaries(summaries ?? []);
        setSelectedMeetingData(null);
        setEditableMeetingData(null);
        setIsLoadingMeetings(false);
    };

    const loadSelectedMeeting = async (pageId) => {
        if (!pageId) {
            setSelectedMeetingData(null);
            setEditableMeetingData(null);
            return;
        }

        setIsLoadingMeeting(true);
        setSaveMessage("");
        setCalendarMessage("");

        const meetingData = await invoke("getMeetingNote", { pageId });

        setSelectedMeetingData(meetingData);
        setEditableMeetingData(meetingData);
        setIsLoadingMeeting(false);
    };

    const saveMeetingData = async () => {
        const result = await invoke("saveLatestMeetingData", {
            meetingData: editableMeetingData,
        });

        setSaveMessage(result.message);

        if (result.success) {
            setSelectedMeetingData(editableMeetingData);
            setMeetingSummaries((currentSummaries) => {
                const nextSummary = {
                    pageId: editableMeetingData.pageId,
                    title: editableMeetingData.title,
                    date: editableMeetingData.date,
                    pageUrl: editableMeetingData.pageUrl,
                };
                const otherSummaries = currentSummaries.filter(
                    (summary) => summary.pageId !== editableMeetingData.pageId,
                );

                return [nextSummary, ...otherSummaries];
            });
        }
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

            <MeetingNotePicker
                isLoadingMeetings={isLoadingMeetings}
                meetingOptions={meetingOptions}
                onClearDate={clearDateFilter}
                onDateChange={handleDateChange}
                onMeetingChange={loadSelectedMeeting}
                selectedDate={selectedDate}
            />

            {hasSelectedMeeting ? (
                <ButtonGroup>
                    <Button
                        appearance="primary"
                        icon="check"
                        onClick={saveMeetingData}
                    >
                        Save
                    </Button>
                    <Button icon="refresh" onClick={() => loadMeetingSummaries(selectedDate)}>
                        Refresh
                    </Button>
                    <Button icon="calendar" onClick={previewCalendarEvent}>
                        Create Calendar Event
                    </Button>
                </ButtonGroup>
            ) : null}

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
                        Save and Create Calendar Event stay disabled until a meeting note is
                        selected.
                    </Text>
                </SectionMessage>
            ) : null}

            {hasSelectedMeeting ? (
                <ConfirmationPanel
                    calendarMessage={calendarMessage}
                    displayedMeetingData={displayedMeetingData}
                    onUpdateField={updateMeetingField}
                    onUpdateGoals={updateGoals}
                    saveMessage={saveMessage}
                />
            ) : null}
        </Stack>
    );
};

ForgeReconciler.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
