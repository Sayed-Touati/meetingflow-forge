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
      .map((resource) => {
        if (!resource?.url) {
          return `<p>${escapeText(resource?.title)}</p>`;
        }

        const title = resource.title ? `${escapeText(resource.title)}: ` : "";
        const linkText = escapeText(resource.linkText || "link");

        return `<p>${title}<a href="${escapeText(resource.url)}">${linkText}</a></p>`;
      })
      .join("")}
  `;
}

export function createMeetingNoteStorageValue(meetingData) {
  const timeText = [meetingData.startTime, meetingData.endTime]
    .filter(Boolean)
    .join(" - ");

  return `
    <h2>Date</h2>
    <p>${meetingData.date ? `<time datetime="${escapeText(meetingData.date)}" />` : ""}</p>

    <h2>Time</h2>
    <p>${escapeText(timeText)}</p>

    ${peopleSection("Participants", meetingData.participants)}
    ${listSection("Goals", meetingData.goals)}
    ${listSection("Brainstorm", meetingData.brainstorm)}
    ${discussionTopicsSection(meetingData.discussionTopics)}
    ${relatedInfoSection(meetingData.resources)}
  `;
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
  const bodyValue = createMeetingNoteStorageValue(meetingData);

  const updateResponse = await updatePage(meetingData.pageId, {
    id: meetingData.pageId,
    status: "current",
    title: meetingData.title || currentPage.title || "Untitled meeting note",
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
    title: meetingData.title || currentPage.title || "",
  };
}
