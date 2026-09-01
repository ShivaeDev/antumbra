import { Database, type NewAgentSession, type StoredAgentSession } from "@antumbra/persistence";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Option } from "effect";

type SubsessionOutcome = Extract<AgentEvent, { type: "subsession.ended" }>["outcome"];

interface NodeOpening {
	readonly kind: string | null;
	readonly label: string | null;
	readonly sessionId: string;
	readonly spawnerSessionId: string;
}

interface NodeAdoption {
	readonly kind: string | undefined;
	readonly label: string | undefined;
	readonly parentSessionId: string;
}

export const makeSessionTreeRows = Effect.gen(function* () {
	const db = yield* Database;
	const openNode = (root: StoredAgentSession, node: NodeOpening) =>
		db.AgentSession.create({
			agentId: root.agentId,
			backend: root.backend,
			charterDeliveredAt: null,
			completeness: "recording",
			cwd: root.cwd,
			executionStatus: "active",
			id: node.sessionId,
			kind: node.kind,
			label: node.label,
			nativeRef: null,
			outcome: null,
			parentSessionId: node.spawnerSessionId,
			rootSessionId: root.rootSessionId,
			status: "open",
		} satisfies NewAgentSession).pipe(Effect.asVoid);
	const closeNode = (sessionId: string, outcome: SubsessionOutcome) =>
		db.AgentSession.where({ id: sessionId }).update({ outcome, status: "closed" }).pipe(Effect.asVoid);
	const adoptNode = (sessionId: string, adoption: NodeAdoption) =>
		Effect.gen(function* () {
			const row = yield* db.AgentSession.where({ id: sessionId }).first();
			if (Option.isNone(row)) {
				return;
			}
			yield* db.AgentSession.where({
				id: sessionId,
				kind: row.value.kind,
				label: row.value.label,
				parentSessionId: row.value.parentSessionId,
			}).update({
				...(row.value.kind === null && adoption.kind !== undefined ? { kind: adoption.kind } : {}),
				...(row.value.label === null && adoption.label !== undefined ? { label: adoption.label } : {}),
				parentSessionId: adoption.parentSessionId,
			});
		}).pipe(Effect.asVoid);
	const nameNode = (sessionId: string, label: string) =>
		Effect.gen(function* () {
			const row = yield* db.AgentSession.where({ id: sessionId }).first();
			if (Option.isNone(row) || row.value.label !== null) {
				return;
			}
			yield* db.AgentSession.where({ id: sessionId, label: null }).update({
				label,
			});
		}).pipe(
			Effect.asVoid,
			Effect.catchCause((cause) => Effect.logError("a subsession label could not be filled in", { sessionId }, cause)),
		);
	const markIncomplete = (sessionId: string) =>
		db.AgentSession.where({ id: sessionId })
			.update({
				completeness: "incomplete",
			})
			.pipe(
				Effect.asVoid,
				Effect.catchCause((cause) => Effect.logError("session completeness could not be marked incomplete", { sessionId }, cause)),
			);
	// A failed root read must not permit node creation.
	const rootRow = (sessionId: string) =>
		db.AgentSession.where({ id: sessionId })
			.first()
			.pipe(
				Effect.catchCause((cause) =>
					Effect.logError("the root Session of a subsession could not be read", { sessionId }, cause).pipe(
						Effect.as(Option.none<StoredAgentSession>()),
					),
				),
			);
	return { adoptNode, closeNode, markIncomplete, nameNode, openNode, rootRow };
});
