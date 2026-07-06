import React from "react";
import {
    Badge,
    Box,
    Button,
    DynamicTable,
    Heading,
    Icon,
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

const cardShellStyles = xcss({
    backgroundColor: "color.background.input",
    borderColor: "color.border",
    borderRadius: "border.radius.200",
    borderStyle: "solid",
    borderWidth: "border.width",
    paddingBlockEnd: "space.250",
    paddingInline: "space.250",
});

const stickyHeaderStyles = xcss({
    backgroundColor: "color.background.input",
    borderBlockEndColor: "color.border",
    borderBlockEndStyle: "solid",
    borderBlockEndWidth: "border.width",
    paddingBlockStart: "space.100",
    paddingBlockEnd: "space.150",
    position: "sticky",
    top: "space.200",
    zIndex: "elevation.surface",
});

const detailsBodyStyles = xcss({
    paddingBlockStart: "space.250",
});

const summaryFieldStyles = xcss({
    backgroundColor: "color.background.accent.blue.subtlest",
    borderColor: "color.border.accent.blue",
    borderRadius: "border.radius.100",
    borderStyle: "solid",
    borderWidth: "border.width",
    minWidth: "180px",
    paddingBlock: "space.200",
    paddingInline: "space.200",
});

const sectionStyles = xcss({
    borderBlockStartColor: "color.border",
    borderBlockStartStyle: "solid",
    borderBlockStartWidth: "border.width",
    paddingBlockStart: "space.200",
});

const sectionIconFrameStyles = xcss({
    backgroundColor: "color.background.accent.blue.subtlest",
    borderColor: "color.border.accent.blue",
    borderStyle: "solid",
    borderWidth: "border.width",
    borderRadius: "border.radius.100",
    paddingBlock: "space.050",
    paddingInline: "space.050",
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
    if (Array.isArray(participant)) {
        return participant.map(getParticipantIdentifier).filter(Boolean).join("-");
    }

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
    if (Array.isArray(participant)) {
        return participant.map(getParticipantLabel).filter(Boolean).join(", ");
    }

    if (typeof participant === "string") {
        return participant;
    }

    return participant?.displayName || participant?.name || getParticipantIdentifier(participant);
}

function EmptyValue({ children }) {
    return <Text color="color.text.subtle">{children}</Text>;
}

function SectionCountBadge({ count }) {
    if (!count) {
        return null;
    }

    return (
        <Badge appearance="default">
            {String(count)}
        </Badge>
    );
}

function StructuredSectionWithCount({ children, count, icon, label }) {
    return (
        <Box xcss={sectionStyles}>
            <Stack space="space.150">
                <Inline space="space.100" alignBlock="center">
                    <Box xcss={sectionIconFrameStyles}>
                        <Icon
                            glyph={icon}
                            label=""
                            primaryColor="color.icon.accent.blue"
                            size="small"
                        />
                    </Box>
                    <Text color="color.text" weight="bold">
                        {label}
                    </Text>
                    <SectionCountBadge count={count} />
                </Inline>
                {children}
            </Stack>
        </Box>
    );
}

function SummaryValue({ children }) {
    return (
        <Text color="color.text" weight="bold">
            {children}
        </Text>
    );
}

function ParticipantsList({ participants }) {
    if (!participants?.length) {
        return <EmptyValue>No participants included in this meeting.</EmptyValue>;
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

function PresenterCell({ presenter }) {
    if (Array.isArray(presenter)) {
        return (
            <Stack space="space.050">
                {presenter.map((person, index) => (
                    <Text key={getParticipantIdentifier(person) || `presenter-${index}`}>
                        {getParticipantLabel(person)}
                    </Text>
                ))}
            </Stack>
        );
    }

    return getParticipantLabel(presenter) || "-";
}

function NotesCell({ notes }) {
    if (Array.isArray(notes)) {
        return (
            <List>
                {notes.map((note, index) => (
                    <ListItem key={`note-${index}`}>
                        <Text>{note}</Text>
                    </ListItem>
                ))}
            </List>
        );
    }

    return notes || "-";
}

function ListField({ emptyMessage, icon, items, label }) {
    const normalizedItems = normalizeListItems(items);

    return (
        <StructuredSectionWithCount
            icon={icon}
            label={label}
        >
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
        </StructuredSectionWithCount>
    );
}

function DiscussionTopicsTable({ topics }) {
    if (!topics?.length) {
        return <EmptyValue>No discussion topics included in this meeting.</EmptyValue>;
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
                        content: <PresenterCell presenter={topic.presenter} />,
                    },
                    { key: `notes-${index}`, content: <NotesCell notes={topic.notes} /> },
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
        linkText: link.linkText,
        url: link.href,
        type: link.type,
    }));
}

function ResourcesList({ resources }) {
    if (!resources?.length) {
        return <EmptyValue>No related info included in this meeting.</EmptyValue>;
    }

    return (
        <List>
            {resources.map((resource, index) => (
                <ListItem key={resource.url || `${resource.title}-${index}`}>
                    <Inline space="space.100" alignBlock="center" shouldWrap>
                        {resource.url && resource.linkText && resource.title ? (
                            <>
                                <Text>{resource.title}:</Text>
                                <Link href={resource.url} openNewTab>
                                    {resource.linkText}
                                </Link>
                            </>
                        ) : resource.url ? (
                            <Link href={resource.url} openNewTab>
                                {resource.title || resource.url}
                            </Link>
                        ) : (
                            <Text>{resource.title || "Untitled resource"}</Text>
                        )}
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
        <Box xcss={cardShellStyles}>
            <Stack space="space.200">
            <Box xcss={stickyHeaderStyles}>
                <Inline spread="space-between" alignBlock="center">
                    <Stack space="space.050">
                        <Heading as="h2">Meeting details</Heading>
                    </Stack>

                    <Inline space="space.100" alignBlock="center" shouldWrap>
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
                <Box xcss={detailsBodyStyles}>
                    <Stack space="space.250">
                        <Inline space="space.200" rowSpace="space.150" shouldWrap>
                            <Box xcss={summaryFieldStyles}>
                                <MeetingField icon="page" label="Title">
                                    <SummaryValue>
                                        {meetingData.title || "Untitled meeting note"}
                                    </SummaryValue>
                                </MeetingField>
                            </Box>

                            <Box xcss={summaryFieldStyles}>
                                <MeetingField icon="calendar" label="Date">
                                    <SummaryValue>{formatDate(meetingData.date)}</SummaryValue>
                                </MeetingField>
                            </Box>

                            <Box xcss={summaryFieldStyles}>
                                <MeetingField icon="clock" label="Time">
                                    <SummaryValue>{meetingTime}</SummaryValue>
                                </MeetingField>
                            </Box>
                        </Inline>

                        <StructuredSectionWithCount
                            count={meetingData.participants?.length}
                            icon="people"
                            label="Participants"
                        >
                            <ParticipantsList participants={meetingData.participants} />
                        </StructuredSectionWithCount>

                        <ListField
                            emptyMessage="No goals included in this meeting."
                            icon="target"
                            items={meetingData.goals}
                            label="Goals"
                        />

                        <ListField
                            emptyMessage="No brainstorm included in this meeting."
                            icon="lightbulb"
                            items={meetingData.brainstorm}
                            label="Brainstorm"
                        />

                        <StructuredSectionWithCount
                            icon="table"
                            label="Discussion topics"
                        >
                            <DiscussionTopicsTable topics={meetingData.discussionTopics} />
                        </StructuredSectionWithCount>

                        <StructuredSectionWithCount
                            icon="link"
                            label="Related info"
                        >
                            <ResourcesList resources={resources} />
                        </StructuredSectionWithCount>
                    </Stack>
                </Box>
            ) : null}
            </Stack>
        </Box>
    );
}
