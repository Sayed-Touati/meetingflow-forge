import React from "react";
import {
    Heading,
    Pressable,
    Stack,
    Text,
    xcss,
} from "@forge/react";


const createActionButtonStyles = ({
                                      backgroundColor,
                                      hoverColor,
                                      pressedColor,
                                      textColor = "color.text.inverse",
                                  }) =>
    xcss({
        width: "260px",
        borderRadius: "border.radius.100",
        paddingBlock: "space.100",
        paddingInline: "space.150",
        fontWeight: "font.weight.semibold",
        textAlign: "center",

        backgroundColor,
        color: textColor,

        ":hover": {
            backgroundColor: hoverColor,
        },

        ":active": {
            backgroundColor: pressedColor,
        },
    });


const calendarButtonStyles = createActionButtonStyles({
    backgroundColor: "color.background.brand.bold",
    hoverColor: "color.background.brand.bold.hovered",
    pressedColor: "color.background.brand.bold.pressed",
});


const slackButtonStyles = createActionButtonStyles({
    backgroundColor: "color.background.accent.magenta.bolder",
    hoverColor: "color.background.accent.magenta.bolder.hovered",
    pressedColor: "color.background.accent.magenta.bolder.pressed",
});


const confluenceButtonStyles = createActionButtonStyles({
    backgroundColor: "color.background.neutral",
    hoverColor: "color.background.neutral.hovered",
    pressedColor: "color.background.neutral.pressed",
    textColor: "color.text",
});


const deleteButtonStyles = createActionButtonStyles({
    backgroundColor: "color.background.danger.bold",
    hoverColor: "color.background.danger.bold.hovered",
    pressedColor: "color.background.danger.bold.pressed",
});


export default function MeetingActions({
                                           isConfluenceLinkAvailable,
                                           onCreateCalendarEvent,
                                           onNotifySlack,
                                           onOpenConfluence,
                                           onDelete,
                                       }) {
    return (
        <Stack space="space.150">

            <Stack space="space.050">
                <Heading as="h3">
                    Actions
                </Heading>

                <Text color="color.text.subtle">
                    Complete your meeting workflow.
                </Text>
            </Stack>


            <Stack space="space.100">

                <Pressable
                    onClick={onCreateCalendarEvent}
                    xcss={calendarButtonStyles}
                >
                    Create Calendar Event
                </Pressable>


                <Pressable
                    onClick={onNotifySlack}
                    xcss={slackButtonStyles}
                >
                    Notify team on Slack
                </Pressable>


                <Pressable
                    onClick={onOpenConfluence}
                    isDisabled={!isConfluenceLinkAvailable}
                    xcss={confluenceButtonStyles}
                >
                    Open in Confluence
                </Pressable>


                <Pressable
                    onClick={onDelete}
                    xcss={deleteButtonStyles}
                >
                    Delete
                </Pressable>

            </Stack>

        </Stack>
    );
}

