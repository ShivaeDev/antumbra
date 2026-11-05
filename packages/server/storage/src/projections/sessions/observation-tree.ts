import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { session as sessionRecordSchema } from "@antumbra/domain-sessions/rows/session.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { selection as sessionNodeSelection } from "@antumbra/server-storage/records/session-node.ts";
import { selection as sessionToolCallSelection } from "@antumbra/server-storage/records/session-tool-call.ts";
import { Effect, Option, Schema } from "effect";
import type { Observation, Session } from "#projections/sessions/observation-types.ts";
import { Records } from "#records.ts";

const open = Effect.fn("Sessions.openNode")(function* (fact: Observation, current: Session, nodes: readonly Session[]) {
	const rows = yield* Records;

	const evidence = fact.evidence;
	if (evidence.type !== "opened") return;
	const at = new Date(fact.at).toISOString();
	const indexed = yield* rows.sessionNode
		.findMany({
			where: { rootSessionId: current.rootSessionId },
			orderBy: { field: "storage_order", direction: "asc" },
			select: sessionNodeSelection,
		})
		.pipe(Effect.orDie);
	const node =
		indexed.find((node) => node.nativeRef === evidence.nativeRef) ?? indexed.find((node) => !node.announced && node.spawnedBy === evidence.spawnedBy);
	const calls = yield* rows.sessionToolCall
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: sessionToolCallSelection })
		.pipe(Effect.orDie);
	const caller = calls.find((call) => call.callId === evidence.spawnedBy);
	const parent = nodes.find((node) => node.id === caller?.sessionId) ?? nodes.find((node) => node.nativeRef === evidence.parentRef) ?? current;
	if (node !== undefined) {
		const stored = yield* rows.session.findById(node.id).pipe(Effect.flatMap(Schema.decodeUnknownEffect(sessionRecordSchema.Row)), Effect.orDie);
		yield* rows.sessionNode
			.updateVoid({ ...{ announced: true, nativeRef: evidence.nativeRef, spawnedBy: evidence.spawnedBy }, id: node.id })
			.pipe(Effect.orDie);
		yield* rows.session
			.updateVoid({
				...{
					...(fact.live ? { status: "open", executionStatus: "active", attached: true, outcome: null, completeness: "recording" } : {}),
					parentSessionId: node.announced ? stored.parentSessionId : parent.id,
					nativeRef: evidence.nativeRef,
					label: evidence.label ?? stored.label,
					kind: evidence.kind ?? stored.kind,
				},
				id: node.id,
			})
			.pipe(Effect.orDie);
		if (!node.announced)
			yield* rows.sessionGap
				.insertVoid({
					id: `${fact.seq}:adopted`,
					sessionId: node.id,
					kind: "adopted-late",
					detail: "The node was recorded before its opening was announced",
					observedAt: at,
				})
				.pipe(Effect.orDie);
		return;
	}
	const id = SessionId.make(`${current.rootSessionId}:${evidence.nativeRef}`);
	yield* rows.session
		.insertVoid({
			...current,
			id,
			nativeRef: evidence.nativeRef,
			parentSessionId: parent.id,
			label: evidence.label,
			kind: evidence.kind,
			executionStatus: fact.live ? "active" : "idle",
			status: "open",
			completeness: "recording",
			outcome: null,
			createdAt: at,
			idleSince: null,
			stoppedAt: null,
			toolCalls: 0,
			openDelegations: 0,
			attached: fact.live,
			charterDeliveredAt: null,
		})
		.pipe(Effect.orDie);
	yield* rows.sessionNode
		.insertVoid({
			id,
			rootSessionId: current.rootSessionId,
			nativeRef: evidence.nativeRef,
			spawnedBy: evidence.spawnedBy,
			announced: true,
		})
		.pipe(Effect.orDie);
});

export const tree = Effect.fn("Sessions.treeEvidence")(function* (fact: Observation, current: Session, nodes: readonly Session[]) {
	const rows = yield* Records;

	yield* open(fact, current, nodes);
	const evidence = fact.evidence;
	if (evidence.type !== "closed" && evidence.type !== "node-audited") return;
	const indexed = yield* rows.sessionNode
		.findMany({
			where: { rootSessionId: current.rootSessionId, nativeRef: evidence.nativeRef },
			orderBy: { field: "storage_order", direction: "asc" },
			select: sessionNodeSelection,
		})
		.pipe(Effect.orDie);
	const id = indexed[0]?.id ?? nodes.find((node) => node.nativeRef === evidence.nativeRef)?.id;
	if (id === undefined) return;
	const node = yield* rows.session
		.findOne({ where: { id: id }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(node)) return;
	const gaps = yield* rows.sessionGap.count({ where: { sessionId: id } }).pipe(Effect.orDie);
	if (evidence.type === "node-audited") {
		if (node.value.completeness !== "unaudited")
			yield* rows.session.updateVoid({ ...{ completeness: gaps > 0 ? "incomplete" : "complete" }, id: id }).pipe(Effect.orDie);
		return;
	}
	yield* rows.session
		.updateVoid({
			...{
				status: "closed",
				executionStatus: "idle",
				attached: false,
				outcome: evidence.outcome,
				completeness: gaps > 0 ? "incomplete" : "recording",
				idleSince: new Date(fact.at).toISOString(),
			},
			id: id,
		})
		.pipe(Effect.orDie);
});
