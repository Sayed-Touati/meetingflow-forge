import { DomUtils, parseDocument } from "htmlparser2";
import { encodeXML } from "entities";

function escapeText(value) {
  return encodeXML(String(value ?? ""));
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

function normalizeList(items) {
  return Array.isArray(items) ? items.filter(Boolean) : items ? [items] : [];
}

function listSection(title, items) {
  const listItems = normalizeList(items);

  return `
    <h2>${escapeText(title)}</h2>
    <ul>
      ${listItems.map((item) => `<li>${escapeText(item)}</li>`).join("")}
    </ul>
  `;
}

function peopleSection(title, people) {
  return listSection(title, normalizeList(people).map(getPersonLabel));
}

function notesHtml(notes) {
  if (Array.isArray(notes)) {
    return `<ul>${notes.map((note) => `<li>${escapeText(note)}</li>`).join("")}</ul>`;
  }

  return escapeText(notes);
}

function discussionTopicsSection(topics) {
  return `
    <h2>Discussion topics</h2>
    <table>
      <tbody>
        <tr><th>Time</th><th>Topic</th><th>Presenter</th><th>Notes</th></tr>
        ${normalizeList(topics)
          .map(
            (topic) => `
              <tr>
                <td>${escapeText(topic?.time)}</td>
                <td>${escapeText(topic?.topic)}</td>
                <td>${escapeText(getPersonLabel(topic?.presenter))}</td>
                <td>${notesHtml(topic?.notes)}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function relatedInfoSection(resources) {
  return `
    <h2>Related info</h2>
    ${normalizeList(resources)
      .map(resourceParagraph)
      .join("")}
  `;
}

function resourceParagraph(resource) {
  if (!resource?.url) {
    return `<p>${escapeText(resource?.title)}</p>`;
  }

  const title = resource.title ? `${escapeText(resource.title)}: ` : "";
  const linkText = escapeText(resource.linkText || "link");

  return `<p>${title}<a href="${escapeText(resource.url)}">${linkText}</a></p>`;
}

const EDITABLE_SECTION_BUILDERS = [
  ["Date", (meetingData) => dateSection(meetingData.date)],
  ["Time", (meetingData) => timeSection(meetingData)],
  ["Participants", (meetingData) =>
    peopleSection("Participants", meetingData.participants)],
  ["Goals", (meetingData) => listSection("Goals", meetingData.goals)],
  ["Brainstorm", (meetingData) => listSection("Brainstorm", meetingData.brainstorm)],
  ["Discussion topics", (meetingData) =>
    discussionTopicsSection(meetingData.discussionTopics)],
  ["Related info", (meetingData) => relatedInfoSection(meetingData.resources)],
];

function dateSection(date) {
  return `
    <h2>Date</h2>
    <p>${date ? `<time datetime="${escapeText(date)}"></time>` : ""}</p>
  `;
}

function timeSection(meetingData) {
  const timeText = [meetingData.startTime, meetingData.endTime]
    .filter(Boolean)
    .join(" - ");

  return `
    <h2>Time</h2>
    <p>${escapeText(timeText)}</p>
  `;
}

function parseStorageFragment(value) {
  return parseDocument(value, {
    decodeEntities: false,
    lowerCaseAttributeNames: false,
    lowerCaseTags: false,
    recognizeSelfClosing: true,
    xmlMode: true,
  });
}

function parseStorageFragmentWithIndices(value) {
  return parseDocument(value, {
    decodeEntities: false,
    lowerCaseAttributeNames: false,
    lowerCaseTags: false,
    recognizeSelfClosing: true,
    withEndIndices: true,
    withStartIndices: true,
    xmlMode: true,
  });
}

function serializeStorageNodes(nodes) {
  return nodes.map((node) => DomUtils.getOuterHTML(node, { xmlMode: true })).join("");
}

function createStorageNodes(value) {
  return parseStorageFragment(value).children;
}

function getNodeText(node) {
  return DomUtils.textContent(node).replace(/\s+/g, " ").trim();
}

function normalizeHeadingText(value) {
  return value
    .replace(/&(?:amp;)?nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/^(:[a-z0-9_+-]+:\s*)+/i, "")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isHeadingNode(node) {
  return node?.type === "tag" && /^h[1-6]$/i.test(node.name);
}

function getHeadingLevel(node) {
  return isHeadingNode(node) ? Number(node.name.slice(1)) : null;
}

function isEditableHeading(node, title) {
  return (
    isHeadingNode(node) &&
    normalizeHeadingText(getNodeText(node)) === normalizeHeadingText(title)
  );
}

function findEditableSectionIndex(nodes, title) {
  return nodes.findIndex((node) => isEditableHeading(node, title));
}

function findEditableSection(nodes, title) {
  const index = findEditableSectionIndex(nodes, title);

  if (index !== -1) {
    return { index, nodes, node: nodes[index] };
  }

  for (const node of nodes) {
    if (!node.children?.length) {
      continue;
    }

    const section = findEditableSection(node.children, title);

    if (section) {
      return section;
    }
  }

  return null;
}

function findEditableContainer(nodes) {
  for (const [title] of EDITABLE_SECTION_BUILDERS) {
    const section = findEditableSection(nodes, title);

    if (section) {
      return section.nodes;
    }
  }

  return nodes;
}

function findSectionEndIndex(nodes, startIndex) {
  const startLevel = getHeadingLevel(nodes[startIndex]);

  for (let index = startIndex + 1; index < nodes.length; index += 1) {
    const headingLevel = getHeadingLevel(nodes[index]);

    if (headingLevel && headingLevel <= startLevel) {
      return index;
    }
  }

  return nodes.length;
}

function replaceSection(rootNodes, appendNodes, title, sectionHtml) {
  const replacementNodes = createStorageNodes(sectionHtml);
  const section = findEditableSection(rootNodes, title);

  if (!section) {
    appendNodes.push(...replacementNodes);
    return;
  }

  const replacementHeadingIndex = findEditableSectionIndex(replacementNodes, title);
  const replacementContentNodes =
    replacementHeadingIndex === -1
      ? replacementNodes
      : replacementNodes.slice(replacementHeadingIndex + 1);

  section.nodes.splice(
    section.index + 1,
    findSectionEndIndex(section.nodes, section.index) - section.index - 1,
    ...replacementContentNodes,
  );
}

function getParentContentEndOffset(currentStorageValue, headingNode) {
  const parentNode = headingNode?.parent;

  if (!parentNode || parentNode.type === "root" || parentNode.endIndex == null) {
    return currentStorageValue.length;
  }

  const closingTagIndex = currentStorageValue.lastIndexOf(
    `</${parentNode.name}>`,
    parentNode.endIndex,
  );

  return closingTagIndex === -1 ? parentNode.endIndex + 1 : closingTagIndex;
}

function findSectionContentEndOffset(currentStorageValue, section) {
  const endIndex = findSectionEndIndex(section.nodes, section.index);
  const nextSectionNode = section.nodes[endIndex];

  if (nextSectionNode?.startIndex != null) {
    return nextSectionNode.startIndex;
  }

  return getParentContentEndOffset(currentStorageValue, section.node);
}

function getGoogleMeetResource(resources = []) {
  return normalizeList(resources).find(
    (resource) =>
      resource?.type === "google-meet" ||
      String(resource?.url ?? "").includes("meet.google.com"),
  );
}

function upsertGoogleMeetParagraph(sectionContent, googleMeetParagraph) {
  const existingMeetParagraphPattern = /<p\b[^>]*>[\s\S]*?meet\.google\.com[\s\S]*?<\/p>/i;

  if (existingMeetParagraphPattern.test(sectionContent)) {
    return sectionContent.replace(existingMeetParagraphPattern, googleMeetParagraph);
  }

  return `${sectionContent}${googleMeetParagraph}`;
}

function getPageTitle(meetingData, currentPage) {
  return meetingData.title?.trim() || currentPage.title || "Untitled meeting note";
}

export function createMeetingNoteStorageValue(meetingData) {
  return `
    ${dateSection(meetingData.date)}
    ${timeSection(meetingData)}
    ${peopleSection("Participants", meetingData.participants)}
    ${listSection("Goals", meetingData.goals)}
    ${listSection("Brainstorm", meetingData.brainstorm)}
    ${discussionTopicsSection(meetingData.discussionTopics)}
    ${relatedInfoSection(meetingData.resources)}
  `;
}

export function updateMeetingNoteStorageValue(currentStorageValue, meetingData) {
  const document = parseStorageFragment(currentStorageValue || "");
  const nodes = document.children;
  const appendNodes = findEditableContainer(nodes);

  for (const [title, buildSection] of EDITABLE_SECTION_BUILDERS) {
    replaceSection(nodes, appendNodes, title, buildSection(meetingData));
  }

  return serializeStorageNodes(nodes);
}

export function updateMeetingNoteRelatedInfoStorageValue(
  currentStorageValue,
  meetingData,
) {
  const document = parseStorageFragmentWithIndices(currentStorageValue || "");
  const nodes = document.children;
  const section = findEditableSection(nodes, "Related info");
  const googleMeetResource = getGoogleMeetResource(meetingData.resources);

  if (!googleMeetResource) {
    return currentStorageValue || "";
  }

  const googleMeetParagraph = resourceParagraph(googleMeetResource);

  if (!section) {
    return `${currentStorageValue || ""}${relatedInfoSection([googleMeetResource])}`;
  }

  const contentStartOffset = section.node.endIndex + 1;
  const contentEndOffset = findSectionContentEndOffset(
    currentStorageValue,
    section,
  );
  const currentSectionContent = currentStorageValue.slice(
    contentStartOffset,
    contentEndOffset,
  );
  const replacementContentHtml = upsertGoogleMeetParagraph(
    currentSectionContent,
    googleMeetParagraph,
  );

  return `${currentStorageValue.slice(0, contentStartOffset)}${replacementContentHtml}${currentStorageValue.slice(contentEndOffset)}`;
}

async function readJsonResponse(response, description) {
  if (!response.ok) {
    const message = `MeetingFlow failed to ${description}.`;

    console.log(message, {
      status: response.status,
      statusText: response.statusText,
    });

    throw new Error(message);
  }

  return response.json();
}

export async function updateConfluenceMeetingNotePage({
  fetchPage,
  meetingData,
  updatePage,
}) {
  const currentPageResponse = await fetchPage(meetingData.pageId);
  const currentPage = await readJsonResponse(
    currentPageResponse,
    `fetch Confluence page ${meetingData.pageId}`,
  );
  const nextVersionNumber = (currentPage.version?.number ?? 1) + 1;
  const bodyValue = updateMeetingNoteStorageValue(
    currentPage.body?.storage?.value || "",
    meetingData,
  );
  const title = getPageTitle(meetingData, currentPage);

  const updateResponse = await updatePage(meetingData.pageId, {
    id: meetingData.pageId,
    status: "current",
    title,
    ...(currentPage.spaceId ? { spaceId: currentPage.spaceId } : {}),
    body: {
      representation: "storage",
      value: bodyValue,
    },
    version: {
      number: nextVersionNumber,
      message: "Updated from MeetingFlow",
    },
  });

  await readJsonResponse(updateResponse, `update Confluence page ${meetingData.pageId}`);

  return {
    ...meetingData,
    title,
  };
}

export async function updateConfluenceMeetingNoteRelatedInfoPage({
  fetchPage,
  meetingData,
  updatePage,
}) {
  const currentPageResponse = await fetchPage(meetingData.pageId);
  const currentPage = await readJsonResponse(
    currentPageResponse,
    `fetch Confluence page ${meetingData.pageId}`,
  );
  const nextVersionNumber = (currentPage.version?.number ?? 1) + 1;
  const bodyValue = updateMeetingNoteRelatedInfoStorageValue(
    currentPage.body?.storage?.value || "",
    meetingData,
  );
  const title = currentPage.title || getPageTitle(meetingData, currentPage);

  const updateResponse = await updatePage(meetingData.pageId, {
    id: meetingData.pageId,
    status: "current",
    title,
    ...(currentPage.spaceId ? { spaceId: currentPage.spaceId } : {}),
    body: {
      representation: "storage",
      value: bodyValue,
    },
    version: {
      number: nextVersionNumber,
      message: "Updated Related info from MeetingFlow",
    },
  });

  await readJsonResponse(updateResponse, `update Confluence page ${meetingData.pageId}`);

  return {
    ...meetingData,
    title,
  };
}
