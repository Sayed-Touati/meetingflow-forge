import React from "react";
import {
    Badge,
    Box,
    Button,
    DynamicTable,
    Heading,
    Inline,
    Link,
    List,
    ListItem,
    Stack,
    Tag,
    TagGroup,
    Text,
    xcss,
} from "@forge/react";
import MeetingField from "./MeetingField";

const stickyHeaderStyles = xcss({
    backgroundColor: "color.background.input",
    paddingBlockStart: "space.050",
    paddingBlockEnd: "space.100",
    position: "sticky",
    top: "space.200",
    zIndex: "elevation.surface",
});

const summaryFieldStyles = xcss({
    minWidth: "180px",
});

function normalizeListItems(items) {
    if (Array.isArray(items)) {
        return items.filter(Boolean);
    }

    return items ? [items] : [];
}

function formatDate(value) {
    if (!value) {
        return "No date extracted.";
    }

    const date = new Date(`${value}T00:00:00Z`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
        year: "numeric",
    }).format(date);
}

function formatTime({ startTime, endTime }) {
    if (startTime && endTime) {
        return `${startTime} - ${endTime}`;
    }

    return startTime || "No time extracted.";
}

function getParticipantIdentifier(participant) {
    if (typeof participant === "string") {
        return participant;
    }

    return (
        participant?.accountId ||
        participant?.userKey ||
        participant?.username ||
        participant?.displayName ||
        participant?.name
    );
}

function getParticipantLabel(participant) {
    if (typeof participant === "string") {
        return participant;
    }

    return participant?.displayName || participant?.name || getParticipantIdentifier(participant);
}

function EmptyValue({ children }) {
    return <Text color="color.text.subtle">{children}</Text>;
}

function StructuredSection({ label, children }) {
    return (
        <Stack space="space.050">
            <Text color="color.text.subtle" size="small" weight="medium">
                {label}
            </Text>
            {children}
        </Stack>
    );
}

function ParticipantsList({ participants }) {
    if (!participants?.length) {
        return <EmptyValue>No participants were extracted yet.</EmptyValue>;
    }

    return (
        <TagGroup>
            {participants.map((participant, index) => (
                <Tag
                    key={getParticipantIdentifier(participant) || `participant-${index}`}
                    text={getParticipantLabel(participant)}
                    color="blue-light"
                />
            ))}
        </TagGroup>
    );
}

function ListField({ emptyMessage, items, label }) {
    const normalizedItems = normalizeListItems(items);

    return (
        <StructuredSection label={label}>
            {normalizedItems.length ? (
                <List>
                    {normalizedItems.map((item, index) => (
                        <ListItem key={`${label}-${index}`}>
                            <Text>{item}</Text>
                        </ListItem>
                    ))}
                </List>
            ) : (
                <EmptyValue>{emptyMessage}</EmptyValue>
            )}
        </StructuredSection>
    );
}

function DiscussionTopicsTable({ topics }) {
    if (!topics?.length) {
        return <EmptyValue>No discussion topic rows were extracted yet.</EmptyValue>;
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
                    {
                        key: `presenter-${index}`,
                        content: getParticipantLabel(topic.presenter) || "-",
                    },
                    { key: `notes-${index}`, content: topic.notes || "-" },
                ],
            }))}
        />
    );
}

function normalizeResources(meetingData) {
    if (meetingData.resources?.length) {
        return meetingData.resources;
    }

    return (meetingData.relatedLinks ?? []).map((link) => ({
        title: link.text || link.href,
        url: link.href,
        type: link.type,
    }));
}

function ResourcesList({ resources }) {
    if (!resources?.length) {
        return <EmptyValue>No resources were extracted yet.</EmptyValue>;
    }

    return (
        <List>
            {resources.map((resource, index) => (
                <ListItem key={resource.url || `${resource.title}-${index}`}>
                    <Inline space="space.100" alignBlock="center" shouldWrap>
                        {resource.url ? (
                            <Link href={resource.url} openNewTab>
                                {resource.title || resource.url}
                            </Link>
                        ) : (
                            <Text>{resource.title || "Untitled resource"}</Text>
                        )}
                        <Badge appearance={resource.type === "google-meet" ? "primary" : "default"}>
                            {resource.type === "google-meet" ? "Google Meet" : resource.url ? "Link" : "No URL"}
                        </Badge>
                    </Inline>
                </ListItem>
            ))}
        </List>
    );
}

export default function MeetingInfoCard({
    isDetailsVisible,
    meetingData,
    onEdit,
    onToggleDetails,
}) {
    const detailsToggleLabel = isDetailsVisible ? "Hide details" : "Show details";
    const meetingTime = formatTime(meetingData);
    const resources = normalizeResources(meetingData);

    return (
        <Stack space="space.200">
            <Box xcss={stickyHeaderStyles}>
                <Inline spread="space-between" alignBlock="center">
                    <Stack space="space.050">
                        <Heading as="h2">Meeting information</Heading>
                        <Inline space="space.100" alignBlock="center">
                            <Badge appearance="primary">
                                {formatDate(meetingData.date)}
                            </Badge>
                            {meetingData.startTime ? <Badge>{meetingTime}</Badge> : null}
                        </Inline>
                    </Stack>

                    <Inline space="space.100" alignBlock="center">
                        <Button
                            appearance="subtle"
                            icon={isDetailsVisible ? "chevron-up" : "chevron-down"}
                            iconPosition="before"
                            onClick={onToggleDetails}
                        >
                            {detailsToggleLabel}
                        </Button>

                        <Button
                            appearance="primary"
                            icon="edit-filled"
                            iconPosition="before"
                            onClick={onEdit}
                        >
                            Edit
                        </Button>
                    </Inline>
                </Inline>
            </Box>

            {isDetailsVisible ? (
                <Stack space="space.200">
                    <Inline space="space.300" rowSpace="space.100" shouldWrap>
                        <Box xcss={summaryFieldStyles}>
                            <MeetingField label="Title">
                                <Text>{meetingData.title || "Untitled meeting note"}</Text>
                            </MeetingField>
                        </Box>

                        <Box xcss={summaryFieldStyles}>
                            <MeetingField label="Date">
                                <Text>{formatDate(meetingData.date)}</Text>
                            </MeetingField>
                        </Box>

                        <Box xcss={summaryFieldStyles}>
                            <MeetingField label="Time">
                                <Text>{meetingTime}</Text>
                            </MeetingField>
                        </Box>
                    </Inline>

                    <StructuredSection label="Participants">
                        <ParticipantsList participants={meetingData.participants} />
                    </StructuredSection>

                    <ListField
                        emptyMessage="No goals were extracted yet."
                        items={meetingData.goals}
                        label="Goals"
                    />

                    <ListField
                        emptyMessage="No brainstorm items were extracted yet."
                        items={meetingData.brainstorm}
                        label="Brainstorm"
                    />

                    <StructuredSection label="Discussion topics">
                        <DiscussionTopicsTable topics={meetingData.discussionTopics} />
                    </StructuredSection>

                    <StructuredSection label="Resources">
                        <ResourcesList resources={resources} />
                    </StructuredSection>
                </Stack>
            ) : null}
        </Stack>
    );
}
