import React, { useEffect, useState } from "react";
import ForgeReconciler, {
    Button,
    Heading,
    Label,
    Link,
    Stack,
    Text,
    TextArea,
    Textfield,
} from "@forge/react";
import { invoke } from "@forge/bridge";

const App = () => {
    const [meetingData, setMeetingData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [editableMeetingData, setEditableMeetingData] = useState(null);

    const loadMeetingData = async () => {
        setIsLoading(true);

        const latestMeetingData = await invoke("getLatestMeetingData");

        setMeetingData(latestMeetingData);
        setEditableMeetingData(latestMeetingData);
        setIsLoading(false);
    };

    const updateMeetingField = (fieldName, value) => {
        setEditableMeetingData((currentMeetingData) => ({
            ...currentMeetingData,
            [fieldName]: value,
        }));
    };

    const updateMeetingSection = (sectionName, value) => {
        setEditableMeetingData((currentMeetingData) => ({
            ...currentMeetingData,
            sections: {
                ...currentMeetingData.sections,
                [sectionName]: value,
            },
        }));
    };

    useEffect(() => {
        loadMeetingData();
    }, []);

    if (isLoading) {
        return <Text>Loading latest meeting data...</Text>;
    }

    if (!meetingData) {
        return (
            <Stack space="space.200">
                <Heading as="h1">MeetingFlow</Heading>
                <Text>No meeting data has been extracted yet.</Text>
                <Button onClick={loadMeetingData}>Refresh</Button>
            </Stack>
        );
    }

    const displayedMeetingData = editableMeetingData ?? meetingData;

    return (
        <Stack space="space.200">
            <Heading as="h1">MeetingFlow</Heading>

            <Label labelFor="title">Title</Label>
            <Textfield
                id="title"
                value={displayedMeetingData.title ?? ""}
                onChange={(event) => updateMeetingField("title", event.target.value)}
            />

            <Label labelFor="date">Date</Label>
            <Textfield
                id="date"
                value={displayedMeetingData.date ?? ""}
                onChange={(event) => updateMeetingField("date", event.target.value)}
            />

            <Label labelFor="page-url">Source page</Label>
            <Link href={displayedMeetingData.pageUrl} openNewTab>
                Open meeting note in Confluence
            </Link>

            <Heading as="h2">Sections</Heading>

            <Label labelFor="date-section">Date notes</Label>
            <TextArea
                id="date-section"
                value={displayedMeetingData.sections?.Date ?? ""}
                onChange={(event) => updateMeetingSection("Date", event.target.value)}
            />

            <Label labelFor="participants">Participants</Label>
            <TextArea
                id="participants"
                value={displayedMeetingData.sections?.Participants ?? ""}
                onChange={(event) => updateMeetingSection("Participants", event.target.value)}
            />

            <Label labelFor="goals">Goals</Label>
            <TextArea
                id="goals"
                value={displayedMeetingData.sections?.Goals ?? ""}
                onChange={(event) => updateMeetingSection("Goals", event.target.value)}
            />

            <Label labelFor="brainstorm">Brainstorm</Label>
            <TextArea
                id="brainstorm"
                value={displayedMeetingData.sections?.Brainstorm ?? ""}
                onChange={(event) => updateMeetingSection("Brainstorm", event.target.value)}
            />

            <Label labelFor="discussion-topics">Discussion topics</Label>
            <TextArea
                id="discussion-topics"
                value={displayedMeetingData.sections?.["Discussion topics"] ?? ""}
                onChange={(event) =>
                    updateMeetingSection("Discussion topics", event.target.value)
                }
            />

            <Label labelFor="related-info">Related info</Label>
            <TextArea
                id="related-info"
                value={displayedMeetingData.sections?.["Related info"] ?? ""}
                onChange={(event) => updateMeetingSection("Related info", event.target.value)}
            />

            <Button onClick={loadMeetingData}>Refresh</Button>
            <Button onClick={() => console.log("Create Calendar Event clicked")}>
                Create Calendar Event
            </Button>
        </Stack>
    );
};

ForgeReconciler.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);