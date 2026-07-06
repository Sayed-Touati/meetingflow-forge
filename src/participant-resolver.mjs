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

      const { name, ...normalizedParticipant } = participant;

      return {
        ...normalizedParticipant,
        // The parser normalizes people with displayName because that mirrors
        // Atlassian's user payloads and keeps the meeting object ready for
        // later attendee-mapping workflows. The name fallback preserves older
        // records that were saved before this normalized shape existed.
        displayName: displayName || participant.displayName || name,
      };
    }),
  );

  return {
    ...meetingNote,
    participants,
  };
}
