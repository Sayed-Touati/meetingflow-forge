import React from "react";
import {
    Box,
    Button,
    Icon,
    Inline,
    Modal,
    ModalBody,
    ModalFooter,
    Stack,
    Text,
    Toggle,
    xcss,
} from "@forge/react";

const toggleRowStyles = xcss({
    backgroundColor: "color.background.neutral.subtle",
    borderColor: "color.border",
    borderRadius: "border.radius.100",
    borderStyle: "solid",
    borderWidth: "border.width",
    paddingBlock: "space.150",
    paddingInline: "space.150",
});

const toggleIconFrameStyles = xcss({
    backgroundColor: "color.background.accent.blue.subtlest",
    borderColor: "color.border.accent.blue",
    borderRadius: "border.radius.100",
    borderStyle: "solid",
    borderWidth: "border.width",
    paddingBlock: "space.050",
    paddingInline: "space.050",
});

function AutomationToggleRow({
    description,
    icon,
    isChecked,
    label,
    name,
    onChange,
}) {
    return (
        <Box xcss={toggleRowStyles}>
            <Inline spread="space-between" alignBlock="center" space="space.200">
                <Inline space="space.150" alignBlock="center">
                    <Box xcss={toggleIconFrameStyles}>
                        <Icon
                            glyph={icon}
                            label=""
                            primaryColor="color.icon.accent.blue"
                            size="small"
                        />
                    </Box>
                    <Stack space="space.050">
                        <Text weight="semibold">{label}</Text>
                        <Text color="color.text.subtle" size="small">
                            {description}
                        </Text>
                    </Stack>
                </Inline>

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

export default function AutomationSettingsDrawer({
    draftSettings,
    onCancel,
    onSave,
    onUpdateDraftSetting,
}) {
    return (
        <Modal onClose={onCancel} title="Automation Settings" width="medium">
            <ModalBody>
                <Stack space="space.200">
                    <Text color="color.text.subtle">
                        Choose what MeetingFlow should do automatically when a valid
                        meeting note is published.
                    </Text>

                    <Stack space="space.150">
                        <AutomationToggleRow
                            description="Automatically create a Google Calendar event when a valid meeting note is published."
                            icon="calendar-plus"
                            isChecked={draftSettings.autoCreateCalendarEvent}
                            label="Create calendar event"
                            name="auto-create-calendar-event"
                            onChange={(value) =>
                                onUpdateDraftSetting("autoCreateCalendarEvent", value)
                            }
                        />

                        <AutomationToggleRow
                            description="Automatically send the meeting information to Slack when a valid meeting note is published."
                            icon="notification"
                            isChecked={draftSettings.autoNotifySlack}
                            label="Notify team on Slack"
                            name="auto-notify-slack"
                            onChange={(value) =>
                                onUpdateDraftSetting("autoNotifySlack", value)
                            }
                        />
                    </Stack>
                </Stack>
            </ModalBody>

            <ModalFooter>
                <Button appearance="subtle" onClick={onCancel}>
                    Cancel
                </Button>
                <Button appearance="primary" onClick={onSave}>
                    Save changes
                </Button>
            </ModalFooter>
        </Modal>
    );
}
