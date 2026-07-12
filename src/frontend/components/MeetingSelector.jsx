import React from "react";
import {
    Button,
    DatePicker,
    Heading,
    Inline,
    Label,
    SectionMessage,
    Select,
    Stack,
    Text,
} from "@forge/react";


export default function MeetingSelector({
                                            isLoadingMeetings,
                                            meetingOptions,
                                            onClearDate,
                                            onDateChange,
                                            onMeetingChange,
                                            calendarStatusAppearance,
                                            calendarStatusMessage,
                                            selectedDate,
                                            selectedMeetingOption,
                                        }) {
    const hasMeetings = meetingOptions.length > 0;

    return (
        <Stack space="space.150">

            <Heading as="h2">
                Choose a Meeting Note
            </Heading>

            <Inline
                space="space.150"
                alignBlock="end"
                shouldWrap
            >
                <Stack space="space.050">
                    <Label labelFor="meeting-note">
                        Meeting note
                    </Label>

                    <Select
                        id="meeting-note"
                        name="meeting-note"
                        placeholder={
                            isLoadingMeetings
                                ? "Loading meeting notes..."
                                : hasMeetings
                                    ? "Select a meeting note"
                                    : "No meeting notes found"
                        }
                        options={meetingOptions}
                        value={selectedMeetingOption}
                        isDisabled={
                            isLoadingMeetings || !hasMeetings
                        }
                        onChange={(option) =>
                            onMeetingChange(option?.value ?? null)
                        }
                    />
                </Stack>


                <Stack space="space.050">
                    <Label labelFor="meeting-filter-date">
                        Filter by date
                    </Label>

                    <Inline
                        space="space.050"
                        alignBlock="center"
                    >
                        <DatePicker
                            id="meeting-filter-date"
                            name="meeting-filter-date"
                            placeholder="Any date"
                            shouldShowCalendarButton
                            value={selectedDate || ""}
                            onChange={onDateChange}
                        />

                        {selectedDate ? (
                            <Button
                                appearance="subtle"
                                iconBefore="cross"
                                onClick={onClearDate}
                            >
                                Clear
                            </Button>
                        ) : null}
                    </Inline>
                </Stack>

            </Inline>

            {calendarStatusMessage ? (
                <SectionMessage appearance={calendarStatusAppearance || "info"}>
                    <Text>{calendarStatusMessage}</Text>
                </SectionMessage>
            ) : null}

        </Stack>
    );
}
