async function readUserProfile(response, accountId) {
  if (!response.ok) {
    console.log("MeetingFlow could not resolve participant display name.", {
      accountId,
      status: response.status,
      statusText: response.statusText,
    });

    return undefined;
  }

  const user = await response.json();

  return {
    displayName: user?.displayName || user?.publicName,
    email: user?.email || user?.emailAddress,
  };
}

async function getProfileForAccountId(accountId, { profilesByAccountId, fetchUser }) {
  if (!profilesByAccountId.has(accountId)) {
    const userResponse = await fetchUser(accountId);
    const profile = await readUserProfile(userResponse, accountId);

    profilesByAccountId.set(accountId, profile);
  }

  return profilesByAccountId.get(accountId);
}

async function resolvePersonDisplayName(person, { profilesByAccountId, fetchUser }) {
  if (Array.isArray(person)) {
    return Promise.all(
      person.map((personItem) =>
        resolvePersonDisplayName(personItem, {
          profilesByAccountId,
          fetchUser,
        }),
      ),
    );
  }

  if (!person?.accountId) {
    return person;
  }

  const profile = await getProfileForAccountId(person.accountId, {
    profilesByAccountId,
    fetchUser,
  });
  const { name, ...normalizedPerson } = person;

  return {
    ...normalizedPerson,
    // The parser normalizes people with displayName because that mirrors
    // Atlassian's user payloads and keeps the meeting object ready for
    // later attendee-mapping workflows. The name fallback preserves older
    // records that were saved before this normalized shape existed.
    displayName: profile?.displayName || person.displayName || name,
    ...(profile?.email || person.email || person.emailAddress
      ? { email: profile?.email || person.email || person.emailAddress }
      : {}),
  };
}

export async function resolveParticipantDisplayNames(meetingNote, { fetchUser }) {
  if (!meetingNote || !fetchUser) {
    return meetingNote;
  }

  const profilesByAccountId = new Map();

  const participants = await Promise.all(
    (meetingNote.participants ?? []).map((participant) =>
      resolvePersonDisplayName(participant, {
        profilesByAccountId,
        fetchUser,
      }),
    ),
  );
  const discussionTopics = await Promise.all(
    (meetingNote.discussionTopics ?? []).map(async (topic) => ({
      ...topic,
      presenter: await resolvePersonDisplayName(topic.presenter, {
        profilesByAccountId,
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
