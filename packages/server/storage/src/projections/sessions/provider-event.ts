import type { providerEvent } from "@antumbra/domain-sessions/facts/provider-event.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { selection as sessionNodeSelection } from "@antumbra/server-storage/records/session-node.ts";
import { Effect, Option } from "effect";
import { Records } from "#records.ts";

export const providerEventMaterializer = Effect.fn("Sessions.providerEvent")(function* (
	fact: FactValue<typeof providerEvent>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const root = yield* rows.session
		.findOne({ where: { id: fact.sessionId }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(root)) return;
	const nodes = yield* rows.sessionNode
		.findMany({
			where: { rootSessionId: root.value.rootSessionId },
			orderBy: { field: "storage_order", direction: "asc" },
			select: sessionNodeSelection,
		})
		.pipe(Effect.orDie);
	const origin = fact.origin;
	const node =
		origin === null
			? undefined
			: nodes.find((node) => (origin.node === undefined ? node.spawnedBy === origin.spawnedBy : node.nativeRef === origin.node));
	const sessionId = node?.id ?? root.value.id;
	const id = `${fact.logId}:${fact.cursor}`;
	yield* rows.sessionEvent
		.insertVoid({
			id,
			sessionId,
			rootSessionId: root.value.rootSessionId,
			logId: fact.logId,
			cursor: fact.cursor,
			observedAt: fact.observedAt,
			sequence: fact.seq,
		})
		.pipe(Effect.orDie);
	if (fact.usage !== null)
		yield* rows.sessionUsage
			.insertVoid({
				id,
				sessionId,
				agentId: root.value.agentId,
				backend: root.value.backend,
				observedAt: fact.observedAt,
				usage: fact.usage,
			})
			.pipe(Effect.orDie);
});
