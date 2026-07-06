import React from "react";
import {
    Box,
    Button,
    DatePicker,
    Heading,
    Inline,
    Modal,
    ModalBody,
    ModalFooter,
    Stack,
    TextArea,
    Textfield,
    Text,
    xcss,
} from "@forge/react";
import {
    EDIT_MEETING_FIELD_LABELS,
    stringifyDiscussionTopics,
    stringifyListItems,
    stringifyParticipants,
    stringifyRelatedInfo,
} from "../meeting-editing.mjs";

const sectionStyles = xcss({
    backgroundColor: "color.background.neutral.subtle",
    borderColor: "color.border",
    borderRadius: "border.radius.100",
    borderStyle: "solid",
    borderWidth: "border.width",
    paddingBlock: "space.200",
    paddingInline: "space.200",
});

const fieldGroupStyles = xcss({
    minWidth: "180px",
});

function FieldLabel({ children }) {
    return (
        <Text color="color.text" weight="bold">
            {children}
        </Text>
    );
}

function LabeledField({ children, label }) {
    return (
        <Stack space="space.075">
            <FieldLabel>{label}</FieldLabel>
            {children}
        </Stack>
    );
}

function getEditableResources(meetingData) {
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

function EditSection({ children, description, title }) {
    return (
        <Box xcss={sectionStyles}>
            <Stack space="space.150">
                <Stack space="space.050">
                    <Heading as="h3">{title}</Heading>
                    {description ? (
                        <Text color="color.text.subtle" size="small">
                            {description}
                        </Text>
                    ) : null}
                </Stack>
                {children}
            </Stack>
        </Box>
    );
}

export default function EditMeetingModal({
    meetingData,
    onCancel,
    onSave,
    onUpdateBrainstorm,
    onUpdateDiscussionTopics,
    onUpdateField,
    onUpdateGoals,
    onUpdateParticipants,
    onUpdateRelatedInfo,
}) {
    return (
        <Modal onClose={onCancel} title="Edit meeting details" width="x-large">
            <ModalBody>
                <Stack space="space.200">
                    <EditSection
                        title="Meeting information"
                        description="Core details used by the meeting card and calendar handoff."
                    >
                        <Stack space="space.150">
                            <LabeledField label={EDIT_MEETING_FIELD_LABELS.title}>
                                <Textfield
                                    name="title"
                                    label={EDIT_MEETING_FIELD_LABELS.title}
                                    value={meetingData.title ?? ""}
                                    onChange={(value) => onUpdateField("title", value)}
                                />
                            </LabeledField>

                            <Inline space="space.150" rowSpace="space.150" shouldWrap>
                                <Box xcss={fieldGroupStyles}>
                                    <LabeledField label={EDIT_MEETING_FIELD_LABELS.date}>
                                        <DatePicker
                                            name="meeting-date"
                                            label={EDIT_MEETING_FIELD_LABELS.date}
                                            defaultValue={meetingData.date}
                                            onChange={(value) => onUpdateField("date", value)}
                                        />
                                    </LabeledField>
                                </Box>

                                <Box xcss={fieldGroupStyles}>
                                    <LabeledField label={EDIT_MEETING_FIELD_LABELS.time}>
                                        <Textfield
                                            name="start-time"
                                            label="Start time"
                                            value={meetingData.startTime ?? ""}
                                            onChange={(value) =>
                                                onUpdateField("startTime", value)
                                            }
                                        />
                                    </LabeledField>
                                </Box>

                                <Box xcss={fieldGroupStyles}>
                                    <LabeledField label={EDIT_MEETING_FIELD_LABELS.time}>
                                        <Textfield
                                            name="end-time"
                                            label="End time"
                                            value={meetingData.endTime ?? ""}
                                            onChange={(value) => onUpdateField("endTime", value)}
                                        />
                                    </LabeledField>
                                </Box>
                            </Inline>
                        </Stack>
                    </EditSection>

                    <EditSection
                        title="People and lists"
                        description="Edit the names and extracted list sections shown in the meeting card."
                    >
                        <Stack space="space.150">
                            <LabeledField label={EDIT_MEETING_FIELD_LABELS.participants}>
                                <TextArea
                                    name="participants"
                                    label={EDIT_MEETING_FIELD_LABELS.participants}
                                    value={stringifyParticipants(meetingData.participants)}
                                    onChange={onUpdateParticipants}
                                />
                            </LabeledField>
                            <LabeledField label={EDIT_MEETING_FIELD_LABELS.goals}>
                                <TextArea
                                    name="goals"
                                    label={EDIT_MEETING_FIELD_LABELS.goals}
                                    value={stringifyListItems(meetingData.goals)}
                                    onChange={onUpdateGoals}
                                />
                            </LabeledField>
                            <LabeledField label={EDIT_MEETING_FIELD_LABELS.brainstorm}>
                                <TextArea
                                    name="brainstorm"
                                    label={EDIT_MEETING_FIELD_LABELS.brainstorm}
                                    value={stringifyListItems(meetingData.brainstorm)}
                                    onChange={onUpdateBrainstorm}
                                />
                            </LabeledField>
                        </Stack>
                    </EditSection>

                    <EditSection
                        title="Discussion topics"
                        description="Each row keeps time, topic, presenter, and notes together."
                    >
                        <LabeledField label={EDIT_MEETING_FIELD_LABELS.discussionTopics}>
                            <TextArea
                                name="discussion-topics"
                                label={EDIT_MEETING_FIELD_LABELS.discussionTopics}
                                isMonospaced
                                value={stringifyDiscussionTopics(meetingData.discussionTopics)}
                                onChange={onUpdateDiscussionTopics}
                            />
                        </LabeledField>
                    </EditSection>

                    <EditSection
                        title="Related info"
                        description="Supporting links and resources shown at the bottom of the card."
                    >
                        <LabeledField label={EDIT_MEETING_FIELD_LABELS.relatedInfo}>
                            <TextArea
                                name="related-info"
                                label={EDIT_MEETING_FIELD_LABELS.relatedInfo}
                                value={stringifyRelatedInfo(getEditableResources(meetingData))}
                                onChange={onUpdateRelatedInfo}
                            />
                        </LabeledField>
                    </EditSection>
                </Stack>
            </ModalBody>
            <ModalFooter>
                <Button appearance="subtle" onClick={onCancel}>
                    Cancel
                </Button>
                <Button appearance="primary" onClick={onSave}>
                    Save changes
                </Button>
            </ModalFooter>
        </Modal>
    );
}
