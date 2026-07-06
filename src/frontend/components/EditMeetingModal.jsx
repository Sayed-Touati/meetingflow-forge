import React from "react";
import {
    Button,
    DatePicker,
    Modal,
    ModalBody,
    ModalFooter,
    Stack,
    TextArea,
    Textfield,
} from "@forge/react";

function createTextFromList(items, formatter = (item) => item) {
    return (items ?? []).map(formatter).join("\n");
}

export default function EditMeetingModal({
    meetingData,
    onCancel,
    onSave,
    onUpdateBrainstorm,
    onUpdateField,
    onUpdateGoals,
}) {
    return (
        <Modal onClose={onCancel} title="Edit meeting details" width="large">
            <ModalBody>
                <Stack space="space.150">
                    <Textfield
                        name="title"
                        label="Title"
                        value={meetingData.title ?? ""}
                        onChange={(value) => onUpdateField("title", value)}
                    />
                    <DatePicker
                        name="meeting-date"
                        label="Meeting date"
                        defaultValue={meetingData.date}
                        onChange={(value) => onUpdateField("date", value)}
                    />
                    <Textfield
                        name="start-time"
                        label="Start time"
                        value={meetingData.startTime ?? ""}
                        onChange={(value) => onUpdateField("startTime", value)}
                    />
                    <Textfield
                        name="end-time"
                        label="End time"
                        value={meetingData.endTime ?? ""}
                        onChange={(value) => onUpdateField("endTime", value)}
                    />
                    <TextArea
                        name="goals"
                        label="Goals"
                        value={createTextFromList(meetingData.goals)}
                        onChange={onUpdateGoals}
                    />
                    <TextArea
                        name="brainstorm"
                        label="Brainstorm"
                        value={createTextFromList(meetingData.brainstorm)}
                        onChange={onUpdateBrainstorm}
                    />
                </Stack>
            </ModalBody>
            <ModalFooter>
                <Button appearance="subtle" onClick={onCancel}>
                    Cancel
                </Button>
                <Button appearance="primary" onClick={onSave}>
                    Save Changes
                </Button>
            </ModalFooter>
        </Modal>
    );
}
