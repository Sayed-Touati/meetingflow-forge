import React from "react";
import {
    Button,
    DatePicker,
    Inline,
    Label,
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
    selectedDate,
}) {
    return (
        <Stack space="space.150">
            <Inline space="space.200" alignBlock="end">
                <Stack space="space.050">
                    <Label labelFor="meeting-note">Meeting note page</Label>
                    <Select
                        id="meeting-note"
                        name="meeting-note"
                        placeholder={
                            isLoadingMeetings ? "Loading meeting notes..." : "Select a meeting note"
                        }
                        options={meetingOptions}
                        isDisabled={isLoadingMeetings || meetingOptions.length === 0}
                        onChange={(option) => onMeetingChange(option?.value)}
                    />
                </Stack>
                <DatePicker
                    key={selectedDate || "all-dates"}
                    name="meeting-filter-date"
                    label="Select date"
                    description="Optional. Leave blank to show every extracted meeting note."
                    defaultValue={selectedDate || undefined}
                    onChange={onDateChange}
                />
            </Inline>

            {selectedDate ? (
                <Button appearance="subtle" icon="cross" onClick={onClearDate}>
                    Clear date filter
                </Button>
            ) : null}

            <Text>
                The dropdown shows every extracted meeting note unless you choose a date.
            </Text>
        </Stack>
    );
}
