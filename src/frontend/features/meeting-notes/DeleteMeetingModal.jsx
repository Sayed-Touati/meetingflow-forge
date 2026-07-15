import React from "react";
import {
    Button,
    Modal,
    ModalBody,
    ModalFooter,
    SectionMessage,
    Stack,
    Text,
} from "@forge/react";

export default function DeleteMeetingModal({
    canDeleteCalendarEvent = false,
    isRemoving,
    meetingTitle,
    onCancel,
    onDelete,
    onDeleteCalendarEvent,
}) {
    return (
        <Modal onClose={onCancel} title="Remove meeting note">
            <ModalBody>
                <Stack space="space.200">
                    <Text>
                        Choose what to do with
                        {meetingTitle ? ` "${meetingTitle}"` : " this meeting note"}.
                    </Text>
                    <SectionMessage appearance="warning" title="This updates Confluence">
                        <Text>
                            Delete moves the Confluence page to trash and removes the note
                            from MeetingFlow after Confluence accepts the change.
                        </Text>
                    </SectionMessage>
                    {canDeleteCalendarEvent ? (
                        <SectionMessage
                            appearance="warning"
                            title="Google Calendar event detected"
                        >
                            <Text>
                                This meeting has a future Google Calendar event. Deleting
                                will remove both the Confluence meeting note and the linked
                                Calendar event.
                            </Text>
                        </SectionMessage>
                    ) : null}
                </Stack>
            </ModalBody>
            <ModalFooter>
                <Button
                    appearance="subtle"
                    disabled={isRemoving}
                    icon="cross"
                    iconPosition="before"
                    onClick={onCancel}
                >
                    Cancel
                </Button>
                <Button
                    appearance="danger"
                    disabled={isRemoving}
                    icon="trash"
                    iconPosition="before"
                    onClick={canDeleteCalendarEvent ? onDeleteCalendarEvent : onDelete}
                >
                    {isRemoving
                        ? "Working..."
                        : canDeleteCalendarEvent ? "Delete note and event" : "Delete"}
                </Button>
            </ModalFooter>
        </Modal>
    );
}
