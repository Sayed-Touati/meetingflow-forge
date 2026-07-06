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

export async function resolveParticipantDisplayNames(meetingNote, { fetchUser }) {
  if (!meetingNote?.participants?.length || !fetchUser) {
    return meetingNote;
  }

  const displayNamesByAccountId = new Map();

  const participants = await Promise.all(
    meetingNote.participants.map(async (participant) => {
      if (!participant.accountId) {
        return participant;
      }

      if (!displayNamesByAccountId.has(participant.accountId)) {
        const userResponse = await fetchUser(participant.accountId);
        const displayName = await readUserDisplayName(
          userResponse,
          participant.accountId,
        );

        displayNamesByAccountId.set(participant.accountId, displayName);
      }

      const displayName = displayNamesByAccountId.get(participant.accountId);

      return {
        ...participant,
        name: displayName || participant.name,
      };
    }),
  );

  return {
    ...meetingNote,
    participants,
  };
}
