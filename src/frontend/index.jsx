import React, { useEffect, useState } from "react";
import ForgeReconciler, { Button, Heading, Stack, Text } from "@forge/react";
import { invoke } from "@forge/bridge";

const App = () => {
    const [meetingData, setMeetingData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadMeetingData = async () => {
        setIsLoading(true);

        const latestMeetingData = await invoke("getLatestMeetingData");

        setMeetingData(latestMeetingData);
        setIsLoading(false);
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

    return (
        <Stack space="space.200">
            <Heading as="h1">MeetingFlow</Heading>

            <Text>Title: {meetingData.title}</Text>
            <Text>Date: {meetingData.date}</Text>
            <Text>Page URL: {meetingData.pageUrl}</Text>

            <Heading as="h2">Sections</Heading>
            <Text>Date section: {meetingData.sections?.Date}</Text>
            <Text>Participants: {meetingData.sections?.Participants}</Text>
            <Text>Goals: {meetingData.sections?.Goals}</Text>
            <Text>Brainstorm: {meetingData.sections?.Brainstorm}</Text>
            <Text>Discussion topics: {meetingData.sections?.["Discussion topics"]}</Text>
            <Text>Related info: {meetingData.sections?.["Related info"]}</Text>

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