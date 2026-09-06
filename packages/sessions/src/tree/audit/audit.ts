import type { StoredAgentSession } from "@antumbra/persistence";
import type { SessionAudit } from "@antumbra/plugin-api";
import { decodeStoredAgentSessionCompleteness } from "@antumbra/vocabulary/agent-runtime.ts";
import { Effect, Result } from "effect";
import { findings } from "#tree/audit/findings.ts";
import { journalOn } from "#tree/audit/journal-on.ts";
import { project } from "#tree/audit/project.ts";

const auditable = (node: StoredAgentSession): boolean => {
	const completeness = decodeStoredAgentSessionCompleteness(node.id, node.completeness);
	return node.status === "closed" && Result.isSuccess(completeness) && completeness.success !== "unaudited";
};

export const audit = Effect.fn("SessionTreeAudits.audit")(function* (lane: SessionAudit, root: StoredAgentSession, node: StoredAgentSession) {
	if (!auditable(node)) return;
	yield* journalOn(node.id, yield* findings(lane, root, node));
	yield* project(node.id);
});
