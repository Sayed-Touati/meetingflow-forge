import React from "react";
import { Stack, Text } from "@forge/react";

export default function MeetingField({ label, children }) {
    return (
        <Stack space="space.050">
            <Text color="color.text.subtle" size="small" weight="medium">
                {label}
            </Text>
            {children}
        </Stack>
    );
}
