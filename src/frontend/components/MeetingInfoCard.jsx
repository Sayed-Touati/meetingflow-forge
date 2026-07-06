import React from "react";
import {
    Badge,
    Box,
    DynamicTable,
    Heading,
    Icon,
    Inline,
    Link,
    List,
    ListItem,
    Pressable,
    SectionMessage,
    Stack,
    Tag,
    TagGroup,
    Text,
    xcss,
} from "@forge/react";
import MeetingField from "./MeetingField";

const editButtonStyles = xcss({
    backgroundColor: "color.background.accent.blue.subtlest",
    borderColor: "color.border.accent.blue",
    borderRadius: "border.radius.100",
    borderStyle: "solid",
    borderWidth: "border.width",
    color: "color.text.accent.blue",
    paddingBlock: "space.075",
    paddingInline: "space.150",

    ":hover": {
        backgroundColor: "color.background.accent.blue.subtlest.hovered",
    },

    ":active": {
        backgroundColor: "color.background.accent.blue.subtlest.pressed",
    },
});

const detailsButtonStyles = xcss({
    backgroundColor: "color.background.neutral.subtle",
    borderColor: "color.border",
    borderRadius: "border.radius.100",
    borderStyle: "solid",
    borderWidth: "border.width",
    color: "color.text",
    paddingBlock: "space.075",
    paddingInline: "space.150",

    ":hover": {
        backgroundColor: "color.background.neutral.subtle.hovered",
    },

    ":active": {
        backgroundColor: "color.background.neutral.subtle.pressed",
    },
});

function createTextFromList(items, formatter = (item) => item) {
    return (items ?? []).map(formatter).join("\n");
}

function getParticipantIdentifier(participant) {
    return participant.accountId || participant.userKey || participant.username || participant.name;
}

function getParticipantLabel(participant) {
    return participant.name || getParticipantIdentifier(participant);
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

function SectionText({ value }) {
    return value ? <Text>{value}</Text> : <Text color="color.text.subtle">Not found.</Text>;
}

export default function MeetingInfoCard({
    isDetailsVisible,
    meetingData,
    onEdit,
    onToggleDetails,
}) {
    const sections = meetingData.sections ?? {};
    const goalsText = createTextFromList(meetingData.goals);
    const detailsToggleLabel = isDetailsVisible ? "Hide details" : "Show details";

    return (
        <Stack space="space.200">
            <Inline spread="space-between" alignBlock="center">
                <Stack space="space.050">
                    <Heading as="h2">{meetingData.title || "Untitled meeting note"}</Heading>
                </Stack>

                <Inline space="space.100" alignBlock="center">
                    <Pressable onClick={onToggleDetails}>
                        <Box xcss={detailsButtonStyles}>
                            <Inline space="space.050" alignBlock="center">
                                <Icon
                                    glyph={isDetailsVisible ? "chevron-up" : "chevron-down"}
                                    label={detailsToggleLabel}
                                    size="small"
                                />
                                <Text weight="medium">{detailsToggleLabel}</Text>
                            </Inline>
                        </Box>
                    </Pressable>

                    <Pressable onClick={onEdit}>
                        <Box xcss={editButtonStyles}>
                            <Inline space="space.050" alignBlock="center">
                                <Icon glyph="edit-filled" label="Edit meeting details" size="small" />
                                <Text color="color.text.accent.blue" weight="medium">
                                    Edit
                                </Text>
                            </Inline>
                        </Box>
                    </Pressable>
                </Inline>
            </Inline>

            <Inline space="space.100" alignBlock="center">
                <Badge appearance="primary">
                    {meetingData.date || "No date"}
                </Badge>
            </Inline>

            {isDetailsVisible ? (
                <Stack space="space.200">
                    <MeetingField label="Title">
                        <Text>{meetingData.title || "Untitled meeting note"}</Text>
                    </MeetingField>

                    <MeetingField label="Date">
                        <Text>{meetingData.date || "No date extracted."}</Text>
                    </MeetingField>

                    <MeetingField label="Participants">
                        {meetingData.participants?.length ? (
                            <TagGroup>
                                {meetingData.participants.map((participant) => (
                                    <Tag
                                        key={getParticipantIdentifier(participant)}
                                        text={getParticipantLabel(participant)}
                                        color="blue-light"
                                    />
                                ))}
                            </TagGroup>
                        ) : (
                            <Text color="color.text.subtle">
                                No participants were extracted yet.
                            </Text>
                        )}
                    </MeetingField>

                    <MeetingField label="Goals">
                        {goalsText ? (
                            <Text>{goalsText}</Text>
                        ) : (
                            <Text color="color.text.subtle">No goals were extracted yet.</Text>
                        )}
                    </MeetingField>

                    <MeetingField label="Brainstorm">
                        <SectionText value={sections.Brainstorm} />
                    </MeetingField>

                    <MeetingField label="Discussion topics">
                        <DiscussionTopicsTable topics={meetingData.discussionTopics} />
                    </MeetingField>

                    <MeetingField label="Resources">
                        <SectionText value={sections.Resources ?? sections["Related info"]} />
                    </MeetingField>

                    <MeetingField label="Meeting links">
                        <RelatedLinks links={meetingData.relatedLinks} />
                    </MeetingField>
                </Stack>
            ) : null}
        </Stack>
    );
}
