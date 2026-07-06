import React from "react";
import {
    Heading,
    Icon,
    Inline,
    Pressable,
    SectionMessage,
    Stack,
    Text,
    Tooltip,
} from "@forge/react";

export default function AppHeader({ isInfoVisible, onToggleInfo }) {
    return (
        <Stack space="space.100">
            <Inline space="space.100" alignBlock="center">
                <Heading as="h1">MeetingFlow</Heading>

                <Tooltip text="About MeetingFlow">
                    <Pressable onClick={onToggleInfo}>
                        <Icon
                            glyph="information-circle"
                            label="About MeetingFlow"
                            size="small"
                        />
                    </Pressable>
                </Tooltip>
            </Inline>

            <Stack space="space.050">
                <Text>
                    Welcome back 👋
                </Text>

                <Text>
                    Select a meeting note to review its details, create a calendar
                    event, and notify your team on Slack.
                </Text>
            </Stack>

            {isInfoVisible ? (
                <SectionMessage
                    appearance="info"
                    title="About MeetingFlow"
                >
                    <Stack space="space.100">
                        <Text>
                            MeetingFlow works with meeting notes that already exist in
                            Confluence.
                        </Text>

                        <Text>
                            Select a meeting → Review details → Create a calendar event →
                            Notify your team on Slack.
                        </Text>
                    </Stack>
                </SectionMessage>
            ) : null}
        </Stack>
    );
}
