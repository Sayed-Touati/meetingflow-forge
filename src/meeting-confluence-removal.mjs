async function requireOkResponse(response, description) {
  if (response.ok) {
    return;
  }

  const message = `MeetingFlow failed to ${description}.`;

  console.log(message, {
    status: response.status,
    statusText: response.statusText,
  });

  throw new Error(message);
}

export async function archiveConfluenceMeetingNotePage({ archivePages, pageId }) {
  const response = await archivePages({
    pages: [{ id: pageId }],
  });

  await requireOkResponse(response, `archive Confluence page ${pageId}`);
}

export async function deleteConfluenceMeetingNotePage({ deletePage, pageId }) {
  const response = await deletePage(pageId);

  await requireOkResponse(response, `delete Confluence page ${pageId}`);
}
