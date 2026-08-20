import {
	Database,
	type StoredAgentSession,
	type WriteExecutors,
	Writer,
} from "@antumbra/persistence";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Option } from "effect";

type SubsessionOpened = Extract<AgentEvent, { type: "subsession.opened" }>;
type SubsessionOutcome = Extract<
	AgentEvent,
	{ type: "subsession.ended" }
>["outcome"];

export interface NodeOpening {
	readonly opened: SubsessionOpened;
	readonly sessionId: string;
	readonly spawnerSessionId: string;
}

export const makeSessionTreeRows = Effect.gen(function* () {
	const db = yield* Database;
	const writer = yield* Writer;
	const executors = yield* Effect.context<WriteExecutors>();
	const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
		Effect.provideContext(effect, executors);
	// why: a node inherits the Agent, the root and the workspace from the row
	// that owns the tree rather than from anything the provider said, so a
	// subsession can never be attributed to another Agent or rooted elsewhere.
	// Display fields are written once, at open, from what the frame named.
	const openNode = (root: StoredAgentSession, node: NodeOpening) =>
		db.AgentSession.create({
			agentId: root.agentId,
			backend: root.backend,
			charterDeliveredAt: null,
			completeness: "recording",
			cwd: root.cwd,
			executionStatus: "active",
			id: node.sessionId,
			kind: node.opened.kind ?? null,
			label: node.opened.label ?? null,
			nativeRef: null,
			outcome: null,
			parentSessionId: node.spawnerSessionId,
			rootSessionId: root.rootSessionId,
			status: "open",
		}).pipe(Effect.asVoid);
	// why: completeness is left where it stands. Whether the node's record is
	// whole is a question about its gaps, and the audit that answers it reads
	// them after the close rather than guessing at the moment of it.
	const closeNode = (sessionId: string, outcome: SubsessionOutcome) =>
		db.AgentSession.where({ id: sessionId })
			.update({ outcome, status: "closed" })
			.pipe(Effect.asVoid);
	// why: a lane that learns a node's name after its first words have to be
	// journaled opens the node unnamed rather than holding its transcript. The
	// name may still arrive, and filling a hole is not renaming: a label already
	// written is what the record said this node was, and it stands.
	const nameNode = (sessionId: string, label: string) =>
		provide(
			writer.write(
				Effect.gen(function* () {
					const row = yield* db.AgentSession.where({ id: sessionId }).first();
					if (Option.isNone(row) || row.value.label !== null) {
						return;
					}
					yield* db.AgentSession.where({ id: sessionId }).update({ label });
				}),
			),
		).pipe(
			Effect.asVoid,
			Effect.catchCause((cause) =>
				Effect.logError(
					"a subsession label could not be filled in",
					{ sessionId },
					cause,
				),
			),
		);
	// why: written outside the journal's transaction on purpose — the fact being
	// recorded is that the journal's own write failed, so it cannot travel on it.
	const markIncomplete = (sessionId: string) =>
		provide(
			writer.write(
				db.AgentSession.where({ id: sessionId }).update({
					completeness: "incomplete",
				}),
			),
		).pipe(
			Effect.asVoid,
			Effect.catchCause((cause) =>
				Effect.logError(
					"session completeness could not be marked incomplete",
					{ sessionId },
					cause,
				),
			),
		);
	// why: a node inherits from a row that must already exist — the spawn wrote
	// it before the stream was attached. A read that cannot answer is refusal,
	// not absence: nothing is minted, so no node is rooted on a guess.
	const rootRow = (sessionId: string) =>
		provide(db.AgentSession.where({ id: sessionId }).first()).pipe(
			Effect.catchCause((cause) =>
				Effect.logError(
					"the root Session of a subsession could not be read",
					{ sessionId },
					cause,
				).pipe(Effect.as(Option.none<StoredAgentSession>())),
			),
		);
	return { closeNode, markIncomplete, nameNode, openNode, rootRow };
});
