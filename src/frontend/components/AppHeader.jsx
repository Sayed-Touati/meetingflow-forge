import React from "react";
import {
    Box,
    Button,
    Heading,
    Inline,
    Popup,
    Stack,
    Text,
    Tooltip,
    xcss,
} from "@forge/react";

const infoPopupStyles = xcss({
    backgroundColor: "elevation.surface.overlay",
    borderColor: "color.border",
    borderRadius: "border.radius.200",
    borderStyle: "solid",
    borderWidth: "border.width",
    boxShadow: "elevation.shadow.overlay",
    padding: "space.200",
    width: "300px",
});

export default function AppHeader({
    isInfoVisible,
    onCloseInfo,
    onOpenAutomationSettings,
    onToggleInfo,
}) {
    return (
        <Stack space="space.200">
            <Inline spread="space-between" alignBlock="center" shouldWrap>
                <Inline space="space.100" alignBlock="center">
                    <Heading as="h1">MeetingFlow</Heading>

                    <Popup
                        isOpen={isInfoVisible}
                        onClose={onCloseInfo}
                        placement="bottom-start"
                        content={() => (
                            <Box xcss={infoPopupStyles}>
                                <Stack space="space.150">
                                    <Heading as="h3">About MeetingFlow</Heading>

                                    <Text>
                                        MeetingFlow helps you turn existing Confluence
                                        meeting notes into organized calendar events
                                        and Slack notifications.
                                    </Text>

                                    <Text size="small">
                                        Select meeting, review details, create event,
                                        notify team.
                                    </Text>
                                </Stack>
                            </Box>
                        )}
                        trigger={() => (
                            <Tooltip text="About MeetingFlow">
                                <Button
                                    appearance="subtle"
                                    icon="info"
                                    onClick={onToggleInfo}
                                />
                            </Tooltip>
                        )}
                    />
                </Inline>

                <Button
                    appearance="subtle"
                    icon="automation"
                    iconPosition="before"
                    onClick={onOpenAutomationSettings}
                >
                    Automations
                </Button>
            </Inline>

            <Stack space="space.050">
                <Text weight="semibold">Welcome back</Text>

                <Text>
                    Select a meeting note to review its details, create a calendar
                    event, and notify your team on Slack.
                </Text>
            </Stack>
        </Stack>
    );
}
