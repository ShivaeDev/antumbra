import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect, Option } from "effect";
import { providerEvent } from "#facts/provider-event.ts";
import { session } from "#rows/session.ts";
import { sessionEvent } from "#rows/session-event.ts";
import { sessionNode } from "#rows/session-node.ts";
import { sessionUsage } from "#rows/session-usage.ts";

export const providerEventMaterializer = materializer(providerEvent, {
	writes: [session, sessionNode, sessionEvent, sessionUsage],
	run: Effect.fn("Sessions.providerEvent")(function* (fact, rows) {
		const root = yield* rows.session.find(fact.sessionId);
		if (Option.isNone(root)) return;
		const nodes = yield* rows.sessionNode.where({ rootSessionId: root.value.rootSessionId });
		const origin = fact.origin;
		const node =
			origin === null
				? undefined
				: nodes.find((node) => (origin.node === undefined ? node.spawnedBy === origin.spawnedBy : node.nativeRef === origin.node));
		const sessionId = node?.id ?? root.value.id;
		const id = `${fact.logId}:${fact.cursor}`;
		yield* rows.sessionEvent.insert({
			id,
			sessionId,
			rootSessionId: root.value.rootSessionId,
			logId: fact.logId,
			cursor: fact.cursor,
			observedAt: fact.observedAt,
			sequence: fact.seq,
		});
		if (fact.usage !== null)
			yield* rows.sessionUsage.insert({
				id,
				sessionId,
				agentId: root.value.agentId,
				backend: root.value.backend,
				observedAt: fact.observedAt,
				usage: fact.usage,
			});
	}),
});
