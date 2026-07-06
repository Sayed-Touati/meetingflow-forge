import React from "react";
import {
    Box,
    Heading,
    Icon,
    Inline,
    Popup,
    Pressable,
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


const infoIconStyles = xcss({
    borderRadius: "border.radius.full",
    padding: "space.050",
    backgroundColor: "color.background.neutral.subtle",

    ":hover": {
        backgroundColor: "color.background.neutral.hovered",
    },

    ":active": {
        backgroundColor: "color.background.neutral.pressed",
    },
});


export default function AppHeader({
                                      isInfoVisible,
                                      onCloseInfo,
                                      onToggleInfo,
                                  }) {
    return (
        <Stack space="space.200">

            <Inline space="space.100" alignBlock="center">
                <Heading as="h1">
                    MeetingFlow
                </Heading>

                <Popup
                    isOpen={isInfoVisible}
                    onClose={onCloseInfo}
                    placement="bottom-start"

                    content={() => (
                        <Box xcss={infoPopupStyles}>
                            <Stack space="space.150">

                                <Heading as="h3">
                                    About MeetingFlow
                                </Heading>

                                <Text>
                                    MeetingFlow helps you turn existing Confluence
                                    meeting notes into organized calendar events
                                    and Slack notifications.
                                </Text>

                                <Text size="small">
                                    Select meeting → Review details → Create event
                                    → Notify team
                                </Text>

                            </Stack>
                        </Box>
                    )}

                    trigger={() => (
                        <Tooltip text="About MeetingFlow">
                            <Pressable
                                onClick={onToggleInfo}
                                xcss={infoIconStyles}
                            >
                                <Icon
                                    glyph="info"
                                    label="About MeetingFlow"
                                    size="small"
                                />
                            </Pressable>
                        </Tooltip>
                    )}
                />
            </Inline>


            <Stack space="space.050">

                <Text weight="semibold">
                    Welcome back 👋
                </Text>

                <Text>
                    Select a meeting note to review its details, create a calendar
                    event, and notify your team on Slack.
                </Text>

            </Stack>

        </Stack>
    );
}