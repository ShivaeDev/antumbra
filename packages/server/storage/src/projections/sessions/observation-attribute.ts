import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { session as sessionRecordSchema } from "@antumbra/domain-sessions/rows/session.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { selection as sessionNodeSelection } from "@antumbra/server-storage/records/session-node.ts";
import { Effect, Option, Schema } from "effect";
import type { Observation, Session } from "#projections/sessions/observation-types.ts";
import { Records } from "#records.ts";

export const attribute = Effect.fn("Sessions.attribute")(function* (fact: Observation, root: Session, nodes: readonly Session[]) {
	const rows = yield* Records;

	const origin = fact.origin;
	if (origin === null) return root;
	const indexed = yield* rows.sessionNode
		.findMany({ where: { rootSessionId: root.rootSessionId }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionNodeSelection })
		.pipe(Effect.orDie);
	const known =
		origin.node === undefined ? indexed.find((node) => node.spawnedBy === origin.spawnedBy) : indexed.find((node) => node.nativeRef === origin.node);
	if (known !== undefined)
		return yield* rows.session.findById(known.id).pipe(Effect.flatMap(Schema.decodeUnknownEffect(sessionRecordSchema.Row)), Effect.orDie);
	const nativeRef = origin.node ?? origin.spawnedBy;
	const id = SessionId.make(`${root.rootSessionId}:${nativeRef}`);
	const parent = nodes.find((node) => node.nativeRef === origin.parentNode) ?? root;
	const held = yield* rows.session
		.findOne({ where: { id: id }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie);
	if (Option.isSome(held)) return held.value;
	const value: Session = {
		...root,
		id,
		nativeRef,
		parentSessionId: parent.id,
		status: "open",
		executionStatus: fact.live ? "active" : "idle",
		completeness: "recording",
		outcome: null,
		label: null,
		kind: null,
		charterDeliveredAt: null,
		attached: fact.live,
		toolCalls: 0,
		openDelegations: 0,
		idleSince: null,
		stoppedAt: null,
		createdAt: new Date(fact.at).toISOString(),
	};
	yield* rows.session.insertVoid(value).pipe(Effect.orDie);
	yield* rows.sessionNode
		.insertVoid({ id, rootSessionId: root.rootSessionId, nativeRef, spawnedBy: origin.spawnedBy, announced: false })
		.pipe(Effect.orDie);
	return value;
});
