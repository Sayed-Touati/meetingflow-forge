import React from "react";
import {
    Box,
    Inline,
    SectionMessage,
    Stack,
    Text,
    xcss,
} from "@forge/react";
import MeetingActions from "./MeetingActions";
import MeetingInfoCard from "./MeetingInfoCard";

const meetingWorkspaceStyles = xcss({
    alignItems: "flex-start",
});

const meetingNoteScrollStyles = xcss({
    flexGrow: 1,
    maxHeight: "70vh",
    minWidth: "0",
    overflowY: "auto",
    paddingBlockEnd: "space.100",
});

const stickyActionsStyles = xcss({
    flexShrink: 0,
    position: "sticky",
    top: "space.200",
});

export default function MeetingDetailsSection({
    calendarMessage,
    isDetailsVisible,
    meetingData,
    onCreateCalendarEvent,
    onDelete,
    onEdit,
    onToggleDetails,
}) {
    return (
        <Stack space="space.200">
            <Box xcss={meetingWorkspaceStyles}>
                <Inline space="space.300" alignBlock="start">
                    <Box xcss={meetingNoteScrollStyles}>
                        <MeetingInfoCard
                            isDetailsVisible={isDetailsVisible}
                            meetingData={meetingData}
                            onEdit={onEdit}
                            onToggleDetails={onToggleDetails}
                        />
                    </Box>

                    <Box xcss={stickyActionsStyles}>
                        <MeetingActions
                            isConfluenceLinkAvailable={Boolean(meetingData.pageUrl)}
                            onCreateCalendarEvent={onCreateCalendarEvent}
                            onDelete={onDelete}
                            pageUrl={meetingData.pageUrl}
                        />
                    </Box>
                </Inline>
            </Box>

            {calendarMessage ? (
                <SectionMessage appearance="info">
                    <Text>{calendarMessage}</Text>
                </SectionMessage>
            ) : null}
        </Stack>
    );
}
