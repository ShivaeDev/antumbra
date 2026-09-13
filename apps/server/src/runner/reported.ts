import type { observed } from "@antumbra/domain-sessions/facts/observed.ts";
import type { FactPayload } from "@antumbra/platform-feature/fact.ts";

export type Observation = FactPayload<typeof observed>;

export interface Reported {
	readonly news: (observation: Observation) => boolean;
	readonly landed: (observation: Observation) => void;
}

export const reported = (): Reported => {
	const sessions = new Map<string, Map<string, string>>();
	const nodes = (sessionId: string): Map<string, string> => {
		const known = sessions.get(sessionId);
		if (known !== undefined) return known;
		const opened = new Map<string, string>();
		sessions.set(sessionId, opened);
		return opened;
	};
	return {
		news: (observation) =>
			observation.evidence.type !== "node-seen" ||
			sessions.get(observation.sessionId)?.get(observation.nodeRef ?? "") !== JSON.stringify(observation),
		landed: (observation) => {
			const evidence = observation.evidence;
			if (evidence.type === "ended") {
				sessions.delete(observation.sessionId);
				return;
			}
			if (evidence.type === "closed") {
				sessions.get(observation.sessionId)?.delete(evidence.nativeRef);
				return;
			}
			if (evidence.type !== "node-seen") return;
			nodes(observation.sessionId).set(observation.nodeRef ?? "", JSON.stringify(observation));
		},
	};
};
