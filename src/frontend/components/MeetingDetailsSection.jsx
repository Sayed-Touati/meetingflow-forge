import React from "react";
import {
    Inline,
    SectionMessage,
    Stack,
    Text,
} from "@forge/react";
import MeetingActions from "./MeetingActions";
import MeetingInfoCard from "./MeetingInfoCard";

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
            <Inline space="space.300" alignBlock="start">
                <MeetingInfoCard
                    isDetailsVisible={isDetailsVisible}
                    meetingData={meetingData}
                    onEdit={onEdit}
                    onToggleDetails={onToggleDetails}
                />

                <MeetingActions
                    isConfluenceLinkAvailable={Boolean(meetingData.pageUrl)}
                    onCreateCalendarEvent={onCreateCalendarEvent}
                    onDelete={onDelete}
                    pageUrl={meetingData.pageUrl}
                />
            </Inline>

            {calendarMessage ? (
                <SectionMessage appearance="info">
                    <Text>{calendarMessage}</Text>
                </SectionMessage>
            ) : null}
        </Stack>
    );
}
