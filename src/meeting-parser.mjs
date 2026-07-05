import { DomUtils, parseDocument } from "htmlparser2";

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
  const withoutPlaceholders = TEMPLATE_PLACEHOLDER_TEXT.reduce(
    (text, placeholder) => text.replaceAll(placeholder, " "),
    value ?? "",
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

function parseDate(documentRoot) {
  const timeNode = findFirstTag(documentRoot.children ?? [], "time");

  return timeNode?.attribs?.datetime;
}

function parseParticipants(sectionNodes) {
  const participantLinks = findAllTags(sectionNodes, "ac:link");

  return participantLinks
    .map((linkNode) => {
      const userNode = findFirstTag(linkNode.children ?? [], "ri:user");

      if (!userNode?.attribs?.["ri:account-id"]) {
        return null;
      }

      return {
        accountId: userNode.attribs["ri:account-id"],
        name: getNodeText(linkNode),
      };
    })
    .filter(Boolean);
}

function parseGoals(sectionNodes) {
  const listItems = findAllTags(sectionNodes, "li");

  if (listItems.length > 0) {
    return listItems.map(getNodeText).filter(Boolean);
  }

  const fallbackText = getNodesText(sectionNodes);

  return fallbackText ? [fallbackText] : [];
}

function normalizeHeader(value) {
  return cleanText(value).toLowerCase();
}

function parseDiscussionTopics(sectionNodes) {
  const tableNode = findFirstTag(sectionNodes, "table");

  if (!tableNode) {
    return [];
  }

  const rows = findAllTags([tableNode], "tr").map((rowNode) =>
    findAllTags(rowNode.children ?? [], "th")
      .concat(findAllTags(rowNode.children ?? [], "td"))
      .map(getNodeText),
  );

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map(normalizeHeader);

  return rows
    .slice(1)
    .map((row) => ({
      time: row[headers.indexOf("time")] ?? "",
      topic: row[headers.indexOf("topic")] ?? "",
      presenter: row[headers.indexOf("presenter")] ?? "",
      notes: row[headers.indexOf("notes")] ?? "",
    }))
    .filter((topic) => Object.values(topic).some(Boolean));
}

function linkType(href) {
  return href.includes("meet.google.com") ? "google-meet" : "link";
}

function parseRelatedLinks(sectionNodes) {
  return findAllTags(sectionNodes, "a")
    .map((linkNode) => {
      const href = linkNode.attribs?.href;

      if (!href) {
        return null;
      }

      return {
        href,
        text: getNodeText(linkNode),
        type: linkType(href),
      };
    })
    .filter(Boolean);
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

  return {
    pageId: page?.id,
    title: page?.title ?? "",
    date: parseDate(documentRoot),
    pageUrl: getPageUrl(page),
    participants: parseParticipants(sectionNodesByHeading.Participants ?? []),
    goals: parseGoals(sectionNodesByHeading.Goals ?? []),
    discussionTopics: parseDiscussionTopics(
      sectionNodesByHeading["Discussion topics"] ?? [],
    ),
    relatedLinks: parseRelatedLinks(sectionNodesByHeading["Related info"] ?? []),
    sections: stringifySections(sectionNodesByHeading),
  };
}
