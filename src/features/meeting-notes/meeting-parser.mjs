import { DomUtils, parseDocument } from "htmlparser2";
import { decodeHTML } from "entities";

const TEMPLATE_PLACEHOLDER_TEXT = [
  "List goals for this meeting (e.g., Set design priorities for FY27)",
  "Type /whiteboard to create an interactive canvas for icebreakers, brainstorms, diagramming, retros, and more",
  "Time Topic Presenter Notes",
  "@ mention teammate",
  "Add notes for each discussion topic",
  "Type /decision to record the decisions you make in this meeting:",
  "Type /database to create a database of related information, meetings, or assets",
];

function isTag(node, name) {
  return node?.type === "tag" && node.name === name;
}

function cleanText(value) {
  const decodedValue = decodeHTML(value ?? "");
  const withoutPlaceholders = TEMPLATE_PLACEHOLDER_TEXT.reduce(
    (text, placeholder) => text.replaceAll(placeholder, " "),
    decodedValue,
  );

  return withoutPlaceholders
    .replace(/&nbsp;/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function getNodeText(node) {
  return getNodesText([node]);
}

function getNodesText(nodes) {
  return cleanText(nodes.flatMap(getTextParts).join(" "));
}

function getTextParts(node) {
  if (!node) {
    return [];
  }

  if (node.type === "text") {
    return [node.data];
  }

  if (node.type === "cdata") {
    return (node.children ?? []).flatMap(getTextParts);
  }

  if (node.type === "comment" && node.data?.startsWith("[CDATA[")) {
    return [node.data.replace(/^\[CDATA\[/, "").replace(/\]\]$/, "")];
  }

  return (node.children ?? []).flatMap(getTextParts);
}

function findAllTags(nodes, tagName) {
  return DomUtils.findAll((node) => isTag(node, tagName), nodes);
}

function findFirstTag(nodes, tagName) {
  return DomUtils.findOne((node) => isTag(node, tagName), nodes);
}

function findDirectChildCells(rowNode) {
  return (rowNode.children ?? []).filter(
    (node) => isTag(node, "th") || isTag(node, "td"),
  );
}

function findAncestorTag(node, tagName) {
  let currentNode = node?.parent;

  while (currentNode) {
    if (isTag(currentNode, tagName)) {
      return currentNode;
    }

    currentNode = currentNode.parent;
  }

  return undefined;
}

function getPageUrl(page) {
  if (!page?._links?.base || !page?._links?.webui) {
    return undefined;
  }

  return `${page._links.base}${page._links.webui}`;
}

function groupSectionsByHeading(documentRoot) {
  const bodyNodes = documentRoot.children ?? [];
  const sections = {};
  let currentHeading;

  for (const node of bodyNodes) {
    if (isTag(node, "h2")) {
      currentHeading = getNodeText(node);

      if (currentHeading && !sections[currentHeading]) {
        sections[currentHeading] = [];
      }

      continue;
    }

    if (currentHeading) {
      sections[currentHeading].push(node);
    }
  }

  return sections;
}

function getSectionNodes(sectionNodesByHeading, headingNames) {
  const normalizedHeadingNames = headingNames.map(normalizeHeader);
  const matchingSection = Object.entries(sectionNodesByHeading).find(([heading]) =>
    normalizedHeadingNames.includes(normalizeHeader(heading)),
  );

  return matchingSection?.[1] ?? [];
}

function getAllSectionNodes(sectionNodesByHeading, headingNames) {
  const normalizedHeadingNames = headingNames.map(normalizeHeader);

  return Object.entries(sectionNodesByHeading)
    .filter(([heading]) => normalizedHeadingNames.includes(normalizeHeader(heading)))
    .flatMap(([, nodes]) => nodes);
}

function parseDate(documentRoot) {
  const timeNode = findAllTags(documentRoot.children ?? [], "time").find((node) =>
    /^\d{4}-\d{2}-\d{2}/.test(node.attribs?.datetime ?? ""),
  );

  return timeNode?.attribs?.datetime;
}

function normalizePersonFromUserNode(userNode) {
  const accountId = userNode.attribs?.["ri:account-id"];
  const userKey = userNode.attribs?.["ri:userkey"];
  const username = userNode.attribs?.["ri:username"];
  const participantId = accountId || userKey || username;

  if (!participantId) {
    return null;
  }

  // Confluence Cloud usually stores mentions as:
  // <ac:link><ri:user ri:account-id="..." /></ac:link>
  // Some pages also include an optional link body with the visible name.
  // When that body is absent, falling back to the identifier is more useful
  // than returning an empty string to the confirmation UI.
  const linkNode = findAncestorTag(userNode, "ac:link");
  const visibleName = linkNode ? getNodeText(linkNode) : "";

  return {
    ...(accountId ? { accountId } : {}),
    ...(userKey ? { userKey } : {}),
    ...(username ? { username } : {}),
    displayName: visibleName || participantId,
  };
}

function getPersonIdentifier(person) {
  return person?.accountId || person?.userKey || person?.username || person?.displayName;
}

function parseParticipants(sectionNodes) {
  const seenParticipantIds = new Set();
  const userNodes = findAllTags(sectionNodes, "ri:user");

  return userNodes
    .map((userNode) => {
      const participant = normalizePersonFromUserNode(userNode);
      const participantId = getPersonIdentifier(participant);

      if (!participantId || seenParticipantIds.has(participantId)) {
        return null;
      }

      seenParticipantIds.add(participantId);

      return participant;
    })
    .filter(Boolean);
}

function parseListSection(sectionNodes) {
  const listItems = findAllTags(sectionNodes, "li");

  if (listItems.length > 0) {
    return listItems.map(getNodeText).filter(Boolean);
  }

  const fallbackText = getNodesText(sectionNodes);

  return fallbackText ? [fallbackText] : [];
}

function parseFlexibleMeetingTime(text) {
  const timePattern = String.raw`(?:\d{1,2}:\d{2}(?:\s*[ap]\.?m\.?)?|\d{1,2}\s*[ap]\.?m\.?)`;
  const timeRangeMatch = cleanText(text).match(
    new RegExp(`(${timePattern})\\s*(?:-|\\u2013|\\u2014|to)\\s*(${timePattern})`, "i"),
  );

  if (timeRangeMatch) {
    return {
      startTime: cleanText(timeRangeMatch[1]),
      endTime: cleanText(timeRangeMatch[2]),
    };
  }

  const singleTimeMatch = cleanText(text).match(new RegExp(`(${timePattern})`, "i"));

  return singleTimeMatch
    ? {
        startTime: cleanText(singleTimeMatch[1]),
        endTime: "",
      }
    : null;
}

function parseMeetingTime(sectionNodesByHeading) {
  const timeText = getNodesText(
    getSectionNodes(sectionNodesByHeading, ["Time", "Date and time", "When"]),
  );

  return parseFlexibleMeetingTime(timeText) ?? {
    startTime: "",
    endTime: "",
  };
}

function normalizeHeader(value) {
  return cleanText(value).toLowerCase();
}

function getCellByHeader(row, headers, headerName) {
  const cellIndex = headers.indexOf(headerName);

  return cellIndex >= 0 ? row[cellIndex] : undefined;
}

function parsePersonCell(cellNode) {
  if (!cellNode) {
    return null;
  }

  const mentionedUsers = findAllTags(cellNode.children ?? [], "ri:user");
  const mentionedPeople = mentionedUsers.map(normalizePersonFromUserNode).filter(Boolean);

  if (mentionedPeople.length === 1) {
    return mentionedPeople[0];
  }

  if (mentionedPeople.length > 1) {
    return mentionedPeople;
  }

  const displayName = getNodeText(cellNode);

  return displayName ? { displayName } : null;
}

function parseNotesCell(cellNode) {
  if (!cellNode) {
    return "";
  }

  const listItems = findAllTags(cellNode.children ?? [], "li")
    .map(getNodeText)
    .filter(Boolean);

  if (listItems.length > 0) {
    return listItems;
  }

  return getNodeText(cellNode);
}

function parseDiscussionTopics(sectionNodes) {
  const tableNode = findFirstTag(sectionNodes, "table");

  if (!tableNode) {
    return [];
  }

  const rows = findAllTags([tableNode], "tr").map((rowNode) =>
    findDirectChildCells(rowNode).map((cellNode) => ({
      node: cellNode,
      text: getNodeText(cellNode),
    })),
  );

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((cell) => normalizeHeader(cell.text));

  return rows
    .slice(1)
    .map((row) => {
      const timeCell = getCellByHeader(row, headers, "time");
      const topicCell = getCellByHeader(row, headers, "topic");
      const presenterCell = getCellByHeader(row, headers, "presenter");
      const notesCell = getCellByHeader(row, headers, "notes");

      return {
        time: timeCell?.text ?? "",
        topic: topicCell?.text ?? "",
        presenter: parsePersonCell(presenterCell?.node),
        notes: parseNotesCell(notesCell?.node),
      };
    })
    .filter((topic) => topic.time || topic.topic || topic.presenter || topic.notes);
}

function linkType(href) {
  return href.includes("meet.google.com") ? "google-meet" : "link";
}

function getTrailingLabelBeforeNode(node) {
  const siblings = node?.parent?.children ?? [];
  const nodeIndex = siblings.indexOf(node);

  if (nodeIndex <= 0) {
    return "";
  }

  const textBeforeNode = getNodesText(siblings.slice(0, nodeIndex));
  const labelMatch = textBeforeNode.match(/(?:^|[.;])\s*([^:.;]+):$/);

  return labelMatch ? cleanText(labelMatch[1]) : "";
}

function createResource({ title, linkText, url }) {
  return {
    title: title || url || "Untitled resource",
    ...(linkText && linkText !== title ? { linkText } : {}),
    url: url ?? "",
    type: url ? linkType(url) : "resource",
  };
}

function parseAnchorResources(sectionNodes) {
  return findAllTags(sectionNodes, "a")
    .map((linkNode) => {
      const url = linkNode.attribs?.href;
      const linkText = getNodeText(linkNode);
      const title = getTrailingLabelBeforeNode(linkNode) || linkText;

      return url
        ? createResource({
            title,
            linkText,
            url,
          })
        : null;
    })
    .filter(Boolean);
}

function parseConfluenceUrlResources(sectionNodes) {
  return findAllTags(sectionNodes, "ri:url")
    .map((urlNode) => {
      const url = urlNode.attribs?.["ri:value"];
      const linkNode = findAncestorTag(urlNode, "ac:link");
      const linkText = linkNode ? getNodeText(linkNode) : "";
      const title = getTrailingLabelBeforeNode(linkNode ?? urlNode) || linkText;

      return url
        ? createResource({
            title,
            linkText,
            url,
          })
        : null;
    })
    .filter(Boolean);
}

function parseResources(sectionNodes) {
  const resources = [];
  const seenResourceKeys = new Set();
  const addResource = (resource) => {
    const resourceKey = resource.url || `${resource.title}-${resources.length}`;

    if (!seenResourceKeys.has(resourceKey)) {
      seenResourceKeys.add(resourceKey);
      resources.push(resource);
    }
  };

  parseAnchorResources(sectionNodes).forEach(addResource);
  parseConfluenceUrlResources(sectionNodes).forEach(addResource);

  // Meeting notes often keep supporting material in list items. When a list
  // item has no URL, keep its label as a resource placeholder instead of
  // losing it; the UI can show it as a non-clickable row.
  findAllTags(sectionNodes, "li").forEach((listItemNode) => {
    if (
      findFirstTag(listItemNode.children ?? [], "a") ||
      findFirstTag(listItemNode.children ?? [], "ri:url")
    ) {
      return;
    }

    const title = getNodeText(listItemNode);

    if (title) {
      addResource(createResource({ title, url: "" }));
    }
  });

  return resources;
}

function resourcesToRelatedLinks(resources) {
  return resources
    .filter((resource) => resource.url)
    .map((resource) => ({
      href: resource.url,
      text: resource.title,
      ...(resource.linkText ? { linkText: resource.linkText } : {}),
      type: resource.type,
    }));
}

function stringifySections(sectionNodesByHeading) {
  return Object.fromEntries(
    Object.entries(sectionNodesByHeading).map(([heading, nodes]) => [
      heading,
      getNodesText(nodes),
    ]),
  );
}

export function parseMeetingNotePage(page) {
  const storageValue = page?.body?.storage?.value ?? "";
  const documentRoot = parseDocument(storageValue, {
    decodeEntities: true,
    lowerCaseAttributeNames: false,
    xmlMode: true,
  });
  const sectionNodesByHeading = groupSectionsByHeading(documentRoot);
  const meetingTime = parseMeetingTime(sectionNodesByHeading);
  const resources = parseResources(
    getAllSectionNodes(sectionNodesByHeading, ["Resources", "Related info"]),
  );

  return {
    pageId: page?.id,
    title: page?.title ?? "",
    date: parseDate(documentRoot),
    ...meetingTime,
    pageUrl: getPageUrl(page),
    participants: parseParticipants(
      getSectionNodes(sectionNodesByHeading, ["Participants"]),
    ),
    goals: parseListSection(getSectionNodes(sectionNodesByHeading, ["Goals"])),
    brainstorm: parseListSection(
      getSectionNodes(sectionNodesByHeading, ["Brainstorm"]),
    ),
    discussionTopics: parseDiscussionTopics(
      getSectionNodes(sectionNodesByHeading, ["Discussion topics"]),
    ),
    resources,
    relatedLinks: resourcesToRelatedLinks(resources),
    sections: stringifySections(sectionNodesByHeading),
  };
}
