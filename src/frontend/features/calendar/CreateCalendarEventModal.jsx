import React from "react";
import {
    Box,
    Button,
    DatePicker,
    DynamicTable,
    ErrorMessage,
    Inline,
    Modal,
    ModalBody,
    ModalFooter,
    SectionMessage,
    Stack,
    Text,
    TextArea,
    Textfield,
    Toggle,
    xcss,
} from "@forge/react";
import { buildCalendarDescriptionPreview } from "../../../features/calendar/calendar-event-form.mjs";

const fieldGroupStyles = xcss({
    flexGrow: 1,
    minWidth: "160px",
});

const toggleRowStyles = xcss({
    backgroundColor: "color.background.neutral.subtle",
    borderColor: "color.border",
    borderRadius: "border.radius.100",
    borderStyle: "solid",
    borderWidth: "border.width",
    paddingBlock: "space.100",
    paddingInline: "space.150",
});

function getFieldError(errors, fieldName) {
    return errors?.[fieldName] ?? "";
}

function CalendarField({ children, error, label }) {
    return (
        <Stack space="space.050">
            <Text weight="bold">{label}</Text>
            {children}
            {error ? <ErrorMessage>{error}</ErrorMessage> : null}
        </Stack>
    );
}

function AccessToggle({ description, isChecked, label, name, onChange }) {
    return (
        <Box xcss={toggleRowStyles}>
            <Inline spread="space-between" alignBlock="center" space="space.200">
                <Stack space="space.025">
                    <Text weight="semibold">{label}</Text>
                    <Text color="color.text.subtle" size="small">
                        {description}
                    </Text>
                </Stack>

                <Toggle
                    isChecked={isChecked}
                    label={label}
                    name={name}
                    onChange={(event) => onChange(event.target.checked)}
                />
            </Inline>
        </Box>
    );
}

function GuestTable({
    draft,
    guestErrors,
    onAddGuest,
    onRemoveGuest,
    onUpdateGuest,
}) {
    return (
        <Stack space="space.100">
            <Inline alignBlock="center" spread="space-between">
                <Text weight="bold">Guests</Text>
                <Button
                    appearance="subtle"
                    icon="add"
                    iconPosition="before"
                    onClick={onAddGuest}
                >
                    Add guest
                </Button>
            </Inline>

            <DynamicTable
                head={{
                    cells: [
                        { key: "name", content: "Name" },
                        { key: "email", content: "Email" },
                        { key: "source", content: "" },
                    ],
                }}
                rows={(draft.guests ?? []).map((guest, index) => ({
                    key: guest.key,
                    cells: [
                        {
                            key: `${guest.key}-name`,
                            content: (
                                <Textfield
                                    label="Name"
                                    name={`guest-name-${guest.key}`}
                                    value={guest.name}
                                    onChange={(value) =>
                                        onUpdateGuest(index, "name", value)
                                    }
                                />
                            ),
                        },
                        {
                            key: `${guest.key}-email`,
                            content: (
                                <Stack space="space.050">
                                    <Textfield
                                        label="Email"
                                        name={`guest-email-${guest.key}`}
                                        value={guest.email}
                                        onChange={(value) =>
                                            onUpdateGuest(index, "email", value)
                                        }
                                    />
                                    {guestErrors?.[guest.key] ? (
                                        <ErrorMessage>
                                            {guestErrors[guest.key]}
                                        </ErrorMessage>
                                    ) : null}
                                </Stack>
                            ),
                        },
                        {
                            key: `${guest.key}-source`,
                            content: guest.isKnownParticipant ? (
                                <Text color="color.text.subtle">From note</Text>
                            ) : (
                                <Button
                                    appearance="subtle"
                                    icon="trash"
                                    iconPosition="before"
                                    onClick={() => onRemoveGuest(index)}
                                >
                                    Remove
                                </Button>
                            ),
                        },
                    ],
                }))}
            />
        </Stack>
    );
}

export default function CreateCalendarEventModal({
    calendarErrorMessage,
    draft,
    fieldErrors,
    guestErrors,
    isCreating,
    meetingData,
    mode = "create",
    onAddGuest,
    onCancel,
    onCreate,
    onRemoveGuest,
    onUpdateDraft,
    onUpdateGuest,
}) {
    const description = buildCalendarDescriptionPreview(meetingData);
    const isUpdateMode = mode === "update";

    return (
        <Modal
            onClose={onCancel}
            title={isUpdateMode ? "Update calendar event" : "Create calendar event"}
            width="x-large"
        >
            <ModalBody>
                <Stack space="space.250">
                    {calendarErrorMessage ? (
                        <SectionMessage appearance="error">
                            <Text>{calendarErrorMessage}</Text>
                        </SectionMessage>
                    ) : null}

                    <CalendarField
                        label="Title"
                        error={getFieldError(fieldErrors, "title")}
                    >
                        <Textfield
                            label="Title"
                            name="calendar-title"
                            placeholder="Enter your calendar event title"
                            value={draft.title}
                            onChange={(value) => onUpdateDraft("title", value)}
                        />
                    </CalendarField>

                    <Inline space="space.150" rowSpace="space.150" shouldWrap>
                        <Box xcss={fieldGroupStyles}>
                            <CalendarField
                                label="Date"
                                error={getFieldError(fieldErrors, "date")}
                            >
                                <DatePicker
                                    label="Date"
                                    name="calendar-date"
                                    defaultValue={draft.date}
                                    onChange={(value) => onUpdateDraft("date", value)}
                                />
                            </CalendarField>
                        </Box>

                        <Box xcss={fieldGroupStyles}>
                            <CalendarField
                                label="Start time"
                                error={getFieldError(fieldErrors, "startTime")}
                            >
                                <Textfield
                                    label="Start time"
                                    name="calendar-start-time"
                                    placeholder="12:00 AM"
                                    value={draft.startTime}
                                    onChange={(value) =>
                                        onUpdateDraft("startTime", value)
                                    }
                                />
                            </CalendarField>
                        </Box>

                        <Box xcss={fieldGroupStyles}>
                            <CalendarField
                                label="End time"
                                error={getFieldError(fieldErrors, "endTime")}
                            >
                                <Textfield
                                    label="End time"
                                    name="calendar-end-time"
                                    placeholder="11:59 PM"
                                    value={draft.endTime}
                                    onChange={(value) =>
                                        onUpdateDraft("endTime", value)
                                    }
                                />
                            </CalendarField>
                        </Box>
                    </Inline>

                    <Stack space="space.100">
                        <AccessToggle
                            description="Send calendar invitations to the guest emails below."
                            isChecked={draft.inviteGuests}
                            label="Invite guests"
                            name="calendar-invite-guests"
                            onChange={(value) => onUpdateDraft("inviteGuests", value)}
                        />
                        <AccessToggle
                            description="Let guests forward the invite to other people."
                            isChecked={draft.guestsCanInviteOthers}
                            label="Guests can invite others"
                            name="calendar-guests-can-invite"
                            onChange={(value) =>
                                onUpdateDraft("guestsCanInviteOthers", value)
                            }
                        />
                        <AccessToggle
                            description="Let invited guests see who else is invited."
                            isChecked={draft.guestsCanSeeOtherGuests}
                            label="Guests can see guest list"
                            name="calendar-guests-can-see-list"
                            onChange={(value) =>
                                onUpdateDraft("guestsCanSeeOtherGuests", value)
                            }
                        />
                        <AccessToggle
                            description="Ask Google Calendar to generate a Google Meet link."
                            isChecked={draft.includeGoogleMeet}
                            label="Include Google Meet link"
                            name="calendar-include-meet"
                            onChange={(value) =>
                                onUpdateDraft("includeGoogleMeet", value)
                            }
                        />
                    </Stack>

                    <GuestTable
                        draft={draft}
                        guestErrors={guestErrors}
                        onAddGuest={onAddGuest}
                        onRemoveGuest={onRemoveGuest}
                        onUpdateGuest={onUpdateGuest}
                    />

                    <Stack space="space.075">
                        <Text weight="bold">Description preview</Text>
                        <TextArea
                            label="Description preview"
                            name="calendar-description-preview"
                            value={description}
                            isReadOnly
                            minimumRows={6}
                        />
                    </Stack>
                </Stack>
            </ModalBody>

            <ModalFooter>
                <Button
                    appearance="subtle"
                    icon="cross"
                    iconPosition="before"
                    onClick={onCancel}
                >
                    Cancel
                </Button>
                <Button
                    appearance="primary"
                    disabled={isCreating}
                    icon="calendar"
                    iconPosition="before"
                    onClick={onCreate}
                >
                    {isCreating
                        ? isUpdateMode ? "Updating..." : "Creating..."
                        : isUpdateMode ? "Update event" : "Create"}
                </Button>
            </ModalFooter>
        </Modal>
    );
}
