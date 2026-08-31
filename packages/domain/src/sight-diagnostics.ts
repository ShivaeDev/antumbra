import type { IntentDiagnostic } from "@antumbra/contract";
import type { PendingIntent } from "#sight-intents.ts";

export interface IntentAttribution {
	readonly agents: ReadonlyMap<string, ReadonlyArray<IntentDiagnostic>>;
	readonly loose: ReadonlyArray<IntentDiagnostic>;
	readonly sessions: ReadonlyMap<string, ReadonlyArray<IntentDiagnostic>>;
}

const append = (into: Map<string, ReadonlyArray<IntentDiagnostic>>, key: string, mark: IntentDiagnostic): void => {
	into.set(key, [...(into.get(key) ?? []), mark]);
};

// Spawn demand can precede both its Agent and Session rows, so unmatched Intents remain fleet-level.
export const attributeIntents = (
	intents: ReadonlyArray<PendingIntent>,
	agentIds: ReadonlySet<string>,
	sessionIds: ReadonlySet<string>,
): IntentAttribution => {
	const agents = new Map<string, ReadonlyArray<IntentDiagnostic>>();
	const sessions = new Map<string, ReadonlyArray<IntentDiagnostic>>();
	const loose: Array<IntentDiagnostic> = [];
	for (const intent of intents) {
		const mark: IntentDiagnostic = {
			detail: intent.detail,
			id: intent.id,
			kind: intent.kind,
			state: intent.state,
		};
		if (intent.sessionId !== null && sessionIds.has(intent.sessionId)) {
			append(sessions, intent.sessionId, mark);
			continue;
		}
		if (intent.agentId !== null && agentIds.has(intent.agentId)) {
			append(agents, intent.agentId, mark);
			continue;
		}
		loose.push(mark);
	}
	return { agents, loose, sessions };
};
