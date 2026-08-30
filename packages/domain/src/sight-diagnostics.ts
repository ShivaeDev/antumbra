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

// why: an Intent names rows that may not exist yet — a spawn waiting for
// admission precedes both its Session and its Agent. Attribution walks from
// the most specific existing subject outwards and keeps whatever is left over
// on the fleet, so no pending demand is dropped for want of a row.
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
