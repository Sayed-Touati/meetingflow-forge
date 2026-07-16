import React from "react";
import {
    Button,
    Heading,
    Stack,
    Text,
} from "@forge/react";

export default function MeetingActions({
                                           calendarEventStatus,
                                           isConfluenceLinkAvailable,
                                           onCreateCalendarEvent,
                                           onNotifySlack,
                                           onDelete,
                                           onOpenConfluence,
                                           pageUrl,
                                       }) {
    const calendarActionLabel = calendarEventStatus?.hasCalendarEvent
        ? calendarEventStatus.canDeleteCalendarEvent
            ? "Update Calendar Event"
            : "Calendar Event Linked"
        : "Create Calendar Event";

    return (
        <Stack space="space.150">

            <Stack space="space.050">
                <Heading as="h3">
                    Actions
                </Heading>

                <Text color="color.text.subtle">
                    Complete your meeting workflow.
                </Text>
            </Stack>


            <Stack space="space.100">

                <Button
                    appearance="primary"
                    icon="calendar"
                    iconPosition="before"
                    onClick={onCreateCalendarEvent}
                    shouldFitContainer
                >
                    {calendarActionLabel}
                </Button>


                <Button
                    appearance="discovery"
                    icon="people"
                    iconPosition="before"
                    disabled={!onNotifySlack}
                    onClick={onNotifySlack}
                    shouldFitContainer
                >
                    Notify Team on Slack
                </Button>


                {isConfluenceLinkAvailable ? (
                    <Button
                        appearance="subtle"
                        icon="page"
                        iconPosition="before"
                        onClick={onOpenConfluence}
                        shouldFitContainer
                    >
                        Open in Confluence
                    </Button>
                ) : (
                    <Text color="color.text.disabled">
                        Open in Confluence
                    </Text>
                )}


                <Button
                    appearance="danger"
                    icon="trash"
                    iconPosition="before"
                    onClick={onDelete}
                    shouldFitContainer
                >
                    Delete
                </Button>

            </Stack>

        </Stack>
    );
}
