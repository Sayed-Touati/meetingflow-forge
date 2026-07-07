import React from "react";
import {
    Box,
    Button,
    DatePicker,
    DynamicTable,
    Inline,
    Modal,
    ModalBody,
    ModalFooter,
    Stack,
    Text,
    TextArea,
    Textfield,
    TimePicker,
    xcss,
} from "@forge/react";
import {
    EDIT_MEETING_FIELD_LABELS,
    getTimePickerValue,
    stringifyListItems,
    stringifyParticipants,
    stringifyRelatedInfo,
} from "../meeting-editing.mjs";

const fieldGroupStyles = xcss({
    flexGrow: 1,
    minWidth: "160px",
});

const wideFieldStyles = xcss({
    paddingBlockEnd: "space.100",
});

function EditableField({ children, label }) {
    return (
        <Stack space="space.075">
            <Text weight="bold">{label}</Text>
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

function getPersonLabel(person) {
    if (Array.isArray(person)) {
        return person.map(getPersonLabel).filter(Boolean).join(", ");
    }

    if (typeof person === "string") {
        return person;
    }

    return person?.displayName || person?.name || person?.accountId || "";
}

function getNotesText(notes) {
    return Array.isArray(notes) ? notes.join("\n") : notes ?? "";
}

function DiscussionTopicsEditor({ onUpdateTopicField, topics }) {
    return (
        <EditableField label={EDIT_MEETING_FIELD_LABELS.discussionTopics}>
            <DynamicTable
                head={{
                    cells: [
                        { key: "time", content: "Time" },
                        { key: "topic", content: "Topic" },
                        { key: "presenter", content: "Presenter" },
                        { key: "notes", content: "Notes" },
                    ],
                }}
                rows={(topics ?? []).map((topic, index) => ({
                    key: `editable-topic-${index}`,
                    cells: [
                        {
                            key: `time-${index}`,
                            content: (
                                <TimePicker
                                    name={`topic-time-${index}`}
                                    label="Time"
                                    defaultValue={getTimePickerValue(topic.time)}
                                    onChange={(value) =>
                                        onUpdateTopicField(index, "time", value)
                                    }
                                />
                            ),
                        },
                        {
                            key: `topic-${index}`,
                            content: (
                                <Textfield
                                    name={`topic-name-${index}`}
                                    label="Topic"
                                    value={topic.topic ?? ""}
                                    onChange={(value) =>
                                        onUpdateTopicField(index, "topic", value)
                                    }
                                />
                            ),
                        },
                        {
                            key: `presenter-${index}`,
                            content: (
                                <Textfield
                                    name={`topic-presenter-${index}`}
                                    label="Presenter"
                                    value={getPersonLabel(topic.presenter)}
                                    onChange={(value) =>
                                        onUpdateTopicField(index, "presenter", value)
                                    }
                                />
                            ),
                        },
                        {
                            key: `notes-${index}`,
                            content: (
                                <TextArea
                                    name={`topic-notes-${index}`}
                                    label="Notes"
                                    value={getNotesText(topic.notes)}
                                    onChange={(value) =>
                                        onUpdateTopicField(index, "notes", value)
                                    }
                                />
                            ),
                        },
                    ],
                }))}
            />
        </EditableField>
    );
}

export default function EditMeetingModal({
    isSaving,
    meetingData,
    onCancel,
    onSave,
    onUpdateBrainstorm,
    onUpdateDiscussionTopicField,
    onUpdateField,
    onUpdateGoals,
    onUpdateParticipants,
    onUpdateRelatedInfo,
}) {
    return (
        <Modal onClose={onCancel} title="Edit meeting details" width="x-large">
            <ModalBody>
                <Stack space="space.250">
                    <Inline space="space.150" rowSpace="space.150" shouldWrap>
                        <Box xcss={fieldGroupStyles}>
                            <EditableField label={EDIT_MEETING_FIELD_LABELS.title}>
                                <Textfield
                                    name="title"
                                    label={EDIT_MEETING_FIELD_LABELS.title}
                                    value={meetingData.title ?? ""}
                                    onChange={(value) => onUpdateField("title", value)}
                                />
                            </EditableField>
                        </Box>

                        <Box xcss={fieldGroupStyles}>
                            <EditableField label={EDIT_MEETING_FIELD_LABELS.date}>
                                <DatePicker
                                    name="meeting-date"
                                    label={EDIT_MEETING_FIELD_LABELS.date}
                                    defaultValue={meetingData.date}
                                    onChange={(value) => onUpdateField("date", value)}
                                />
                            </EditableField>
                        </Box>

                        <Box xcss={fieldGroupStyles}>
                            <EditableField label={EDIT_MEETING_FIELD_LABELS.startTime}>
                                <TimePicker
                                    name="start-time"
                                    label={EDIT_MEETING_FIELD_LABELS.startTime}
                                    defaultValue={getTimePickerValue(meetingData.startTime)}
                                    onChange={(value) => onUpdateField("startTime", value)}
                                />
                            </EditableField>
                        </Box>

                        <Box xcss={fieldGroupStyles}>
                            <EditableField label={EDIT_MEETING_FIELD_LABELS.endTime}>
                                <TimePicker
                                    name="end-time"
                                    label={EDIT_MEETING_FIELD_LABELS.endTime}
                                    defaultValue={getTimePickerValue(meetingData.endTime)}
                                    onChange={(value) => onUpdateField("endTime", value)}
                                />
                            </EditableField>
                        </Box>
                    </Inline>

                    <Box xcss={wideFieldStyles}>
                        <EditableField label={EDIT_MEETING_FIELD_LABELS.participants}>
                            <TextArea
                                name="participants"
                                label={EDIT_MEETING_FIELD_LABELS.participants}
                                value={stringifyParticipants(meetingData.participants)}
                                onChange={onUpdateParticipants}
                            />
                        </EditableField>
                    </Box>

                    <Box xcss={wideFieldStyles}>
                        <EditableField label={EDIT_MEETING_FIELD_LABELS.goals}>
                            <TextArea
                                name="goals"
                                label={EDIT_MEETING_FIELD_LABELS.goals}
                                value={stringifyListItems(meetingData.goals)}
                                onChange={onUpdateGoals}
                            />
                        </EditableField>
                    </Box>

                    <Box xcss={wideFieldStyles}>
                        <EditableField label={EDIT_MEETING_FIELD_LABELS.brainstorm}>
                            <TextArea
                                name="brainstorm"
                                label={EDIT_MEETING_FIELD_LABELS.brainstorm}
                                value={stringifyListItems(meetingData.brainstorm)}
                                onChange={onUpdateBrainstorm}
                            />
                        </EditableField>
                    </Box>

                    <DiscussionTopicsEditor
                        onUpdateTopicField={onUpdateDiscussionTopicField}
                        topics={meetingData.discussionTopics}
                    />

                    <Box xcss={wideFieldStyles}>
                        <EditableField label={EDIT_MEETING_FIELD_LABELS.relatedInfo}>
                            <TextArea
                                name="related-info"
                                label={EDIT_MEETING_FIELD_LABELS.relatedInfo}
                                value={stringifyRelatedInfo(getEditableResources(meetingData))}
                                onChange={onUpdateRelatedInfo}
                            />
                        </EditableField>
                    </Box>
                </Stack>
            </ModalBody>
            <ModalFooter>
                <Button appearance="subtle" onClick={onCancel}>
                    Cancel
                </Button>
                <Button appearance="primary" disabled={isSaving} onClick={onSave}>
                    {isSaving ? "Saving..." : "Save changes"}
                </Button>
            </ModalFooter>
        </Modal>
    );
}
