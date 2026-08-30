import { SessionAttachmentFailure } from "#errors.ts";

export interface AttachmentOccupant {
	readonly agentId: string;
}

// why: an Agent holds at most one attached Session and a Session answers only
// to the Agent that opened it. Both refusals are read off the current map
// before anything is opened, so a refused attach starts no process.
export const occupancyRefusal = (
	current: ReadonlyMap<string, AttachmentOccupant>,
	agentId: string,
	sessionId: string,
): SessionAttachmentFailure | undefined => {
	const occupied = [...current.values()].find((entry) => entry.agentId === agentId);
	if (occupied !== undefined && current.get(sessionId) !== occupied) {
		return new SessionAttachmentFailure({
			detail: `Agent ${agentId} already has a different attached Session`,
		});
	}
	const entry = current.get(sessionId);
	return entry !== undefined && entry.agentId !== agentId
		? new SessionAttachmentFailure({
				detail: `Session ${sessionId} belongs to a different Agent`,
			})
		: undefined;
};
