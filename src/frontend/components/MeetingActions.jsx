import React from "react";
import {
    Button,
    Heading,
    LinkButton,
    Stack,
    Text,
} from "@forge/react";

export default function MeetingActions({
    isConfluenceLinkAvailable,
    onCreateCalendarEvent,
    onDelete,
    pageUrl,
}) {
    return (
        <Stack space="space.150">
            <Stack space="space.050">
                <Heading as="h3">Actions</Heading>
                <Text color="color.text.subtle">
                    Use these actions after reviewing the extracted meeting details.
                </Text>
            </Stack>

            <Button
                appearance="primary"
                icon="calendar"
                onClick={onCreateCalendarEvent}
                shouldFitContainer
            >
                Create Calendar Event
            </Button>

            <LinkButton
                appearance="default"
                href={pageUrl}
                isDisabled={!isConfluenceLinkAvailable}
                shouldFitContainer
                target="_blank"
            >
                Open in Confluence
            </LinkButton>

            <Button
                appearance="danger"
                icon="trash"
                onClick={onDelete}
                shouldFitContainer
            >
                Delete
            </Button>
        </Stack>
    );
}
