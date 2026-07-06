import React from "react";
import {
    Box,
    Icon,
    Inline,
    Stack,
    Text,
    xcss,
} from "@forge/react";

const labelIconFrameStyles = xcss({
    backgroundColor: "color.background.accent.blue.subtlest",
    borderRadius: "border.radius.100",
    paddingBlock: "space.025",
    paddingInline: "space.025",
});

export default function MeetingField({ children, icon, label }) {
    return (
        <Stack space="space.075">
            <Inline space="space.075" alignBlock="center">
                {icon ? (
                    <Box xcss={labelIconFrameStyles}>
                        <Icon
                            glyph={icon}
                            label=""
                            primaryColor="color.icon.accent.blue"
                            size="small"
                        />
                    </Box>
                ) : null}
                <Text color="color.text" size="small" weight="bold">
                    {label}
                </Text>
            </Inline>
            {children}
        </Stack>
    );
}
