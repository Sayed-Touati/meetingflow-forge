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
    isRemoving,
    meetingTitle,
    onArchive,
    onCancel,
    onDelete,
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
                            Archive moves the Confluence page to archived content. Delete
                            moves the Confluence page to trash. Both actions remove the
                            note from MeetingFlow after Confluence accepts the change.
                        </Text>
                    </SectionMessage>
                </Stack>
            </ModalBody>
            <ModalFooter>
                <Button appearance="subtle" disabled={isRemoving} onClick={onCancel}>
                    Cancel
                </Button>
                <Button appearance="warning" disabled={isRemoving} onClick={onArchive}>
                    {isRemoving ? "Working..." : "Archive"}
                </Button>
                <Button appearance="danger" disabled={isRemoving} onClick={onDelete}>
                    {isRemoving ? "Working..." : "Delete"}
                </Button>
            </ModalFooter>
        </Modal>
    );
}
