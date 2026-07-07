export const EDIT_MEETING_FIELD_LABELS = {
    title: "Title",
    date: "Date",
    startTime: "Start time",
    endTime: "End time",
    time: "Time",
    participants: "Participants",
    goals: "Goals",
    brainstorm: "Brainstorm",
    discussionTopics: "Discussion topics",
    relatedInfo: "Related info",
};

export function getEditableInputValue(value) {
    if (Array.isArray(value)) {
        return value.map(getEditableInputValue).filter(Boolean).join("; ");
    }

    if (value?.target && "value" in value.target) {
        return value.target.value ?? "";
    }

    if (value?.currentTarget && "value" in value.currentTarget) {
        return value.currentTarget.value ?? "";
    }

    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }

    if (value?.displayName) {
        return value.displayName;
    }

    if (value?.title) {
        return value.title;
    }

    if (value?.text) {
        return value.text;
    }

    if (value?.name) {
        return value.name;
    }

    return "";
}

function cleanEditableText(value) {
    return getEditableInputValue(value).trim();
}

export function getTimePickerValue(value) {
    const match = cleanEditableText(value).match(/^(\d{1,2}):(\d{2})(?:\s*([ap])\.?m\.?)?$/i);

    if (!match) {
        return "";
    }

    const [, hourText, minuteText, meridiem] = match;
    let hour = Number(hourText);
    const minute = Number(minuteText);

    if (minute > 59 || hour > 23 || (meridiem && hour > 12)) {
        return "";
    }

    if (meridiem) {
        const normalizedMeridiem = meridiem.toLowerCase();
        hour = hour % 12;

        if (normalizedMeridiem === "p") {
            hour += 12;
        }
    }

    return `${String(hour).padStart(2, "0")}:${minuteText}`;
}

function textLines(value) {
    return getEditableInputValue(value)
        .split("\n")
        .map(cleanEditableText)
        .filter(Boolean);
}

function getPersonLabel(person) {
    if (Array.isArray(person)) {
        return person.map(getPersonLabel).filter(Boolean).join(", ");
    }

    if (typeof person === "string") {
        return person;
    }

    return person?.displayName || person?.name || person?.accountId || "";
}

function getResourceType(url) {
    return url.includes("meet.google.com") ? "google-meet" : "link";
}

function parseRelatedInfoLabel(value) {
    const labelMatch = cleanEditableText(value).match(/^([^:]+):\s*(.+)$/);

    if (!labelMatch) {
        return {
            title: cleanEditableText(value),
            linkText: "",
        };
    }

    return {
        title: cleanEditableText(labelMatch[1]),
        linkText: cleanEditableText(labelMatch[2]),
    };
}

function createResource({ title, linkText, url }) {
    const cleanUrl = cleanEditableText(url);
    const cleanTitle = cleanEditableText(title) || cleanUrl || "Untitled resource";
    const cleanLinkText = cleanEditableText(linkText);

    return {
        title: cleanTitle,
        ...(cleanLinkText && cleanLinkText !== cleanTitle ? { linkText: cleanLinkText } : {}),
        url: cleanUrl,
        type: cleanUrl ? getResourceType(cleanUrl) : "resource",
    };
}

export function parseListText(value) {
    return textLines(value);
}

export function stringifyListItems(items, formatter = (item) => item) {
    return (items ?? [])
        .map(formatter)
        .map(cleanEditableText)
        .filter(Boolean)
        .join("\n");
}

export function stringifyParticipants(participants) {
    return stringifyListItems(participants, getPersonLabel);
}

export function parseParticipantsText(value) {
    return textLines(value).map((displayName) => ({ displayName }));
}

export function stringifyDiscussionTopics(topics) {
    return stringifyListItems(topics, (topic) =>
        [
            topic?.time,
            topic?.topic,
            getPersonLabel(topic?.presenter),
            topic?.notes,
        ]
            .map((fieldValue) => cleanEditableText(fieldValue))
            .join(" | "),
    );
}

export function parseDiscussionTopicsText(value) {
    return textLines(value)
        .map((line) => {
            const [time = "", topic = "", presenter = "", ...notesParts] = line
                .split("|")
                .map(cleanEditableText);
            const notes = notesParts.join(" | ");

            return {
                time,
                topic,
                presenter: presenter ? { displayName: presenter } : null,
                notes,
            };
        })
        .filter(
            (topic) => topic.time || topic.topic || topic.presenter || topic.notes,
        );
}

export function stringifyRelatedInfo(resources) {
    return stringifyListItems(resources, (resource) => {
        if (!resource?.url) {
            return resource?.title;
        }

        if (resource.linkText && resource.title) {
            return `${resource.title}: ${resource.linkText} | ${resource.url}`;
        }

        if (resource.title) {
            return `${resource.title}: ${resource.url}`;
        }

        return resource.url;
    });
}

export function parseRelatedInfoText(value) {
    return textLines(value).map((line) => {
        const [labelText, ...urlParts] = line.split("|");
        const pipedUrl = cleanEditableText(urlParts.join("|"));

        if (pipedUrl) {
            const label = parseRelatedInfoLabel(labelText);

            return createResource({
                title: label.title,
                linkText: label.linkText,
                url: pipedUrl,
            });
        }

        const urlLabelMatch = line.match(/^([^:]+):\s*(https?:\/\/.+)$/);

        if (urlLabelMatch) {
            return createResource({
                title: urlLabelMatch[1],
                url: urlLabelMatch[2],
            });
        }

        if (/^https?:\/\//.test(line)) {
            return createResource({
                title: line,
                url: line,
            });
        }

        return createResource({
            title: line,
            url: "",
        });
    });
}

export function relatedLinksFromResources(resources) {
    return (resources ?? [])
        .filter((resource) => resource.url)
        .map((resource) => ({
            href: resource.url,
            text: resource.title,
            ...(resource.linkText ? { linkText: resource.linkText } : {}),
            type: resource.type,
        }));
}
