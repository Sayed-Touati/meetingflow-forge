async function readUserDisplayName(response, accountId) {
  if (!response.ok) {
    console.log("MeetingFlow could not resolve participant display name.", {
      accountId,
      status: response.status,
      statusText: response.statusText,
    });

    return undefined;
  }

  const user = await response.json();

  return user?.displayName || user?.publicName;
}

async function getDisplayNameForAccountId(accountId, { displayNamesByAccountId, fetchUser }) {
  if (!displayNamesByAccountId.has(accountId)) {
    const userResponse = await fetchUser(accountId);
    const displayName = await readUserDisplayName(userResponse, accountId);

    displayNamesByAccountId.set(accountId, displayName);
  }

  return displayNamesByAccountId.get(accountId);
}

async function resolvePersonDisplayName(person, { displayNamesByAccountId, fetchUser }) {
  if (!person?.accountId) {
    return person;
  }

  const displayName = await getDisplayNameForAccountId(person.accountId, {
    displayNamesByAccountId,
    fetchUser,
  });
  const { name, ...normalizedPerson } = person;

  return {
    ...normalizedPerson,
    // The parser normalizes people with displayName because that mirrors
    // Atlassian's user payloads and keeps the meeting object ready for
    // later attendee-mapping workflows. The name fallback preserves older
    // records that were saved before this normalized shape existed.
    displayName: displayName || person.displayName || name,
  };
}

export async function resolveParticipantDisplayNames(meetingNote, { fetchUser }) {
  if (!meetingNote || !fetchUser) {
    return meetingNote;
  }

  const displayNamesByAccountId = new Map();

  const participants = await Promise.all(
    (meetingNote.participants ?? []).map((participant) =>
      resolvePersonDisplayName(participant, {
        displayNamesByAccountId,
        fetchUser,
      }),
    ),
  );
  const discussionTopics = await Promise.all(
    (meetingNote.discussionTopics ?? []).map(async (topic) => ({
      ...topic,
      presenter: await resolvePersonDisplayName(topic.presenter, {
        displayNamesByAccountId,
        fetchUser,
      }),
    })),
  );

  return {
    ...meetingNote,
    participants,
    discussionTopics,
  };
}
