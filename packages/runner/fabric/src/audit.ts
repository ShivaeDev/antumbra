import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
import { Effect } from "effect";
import { observeCensus } from "#activity.ts";
import { RunnerLog } from "#log.ts";
import { BackendRegistry } from "#ports.ts";
import { record } from "#record.ts";
import type { Attachment, Opening } from "#state.ts";

export const audit = Effect.fn("RunnerFabric.audit")(function* (entry: Attachment, opening: Opening, rootRef: string, nodeRef?: string) {
	const log = yield* RunnerLog;
	const registry = yield* BackendRegistry;
	const backend = registry.backends.get(opening.options.backend);
	if (backend === undefined) return yield* Effect.die("attached backend missing");
	entry.activity.audits++;
	yield* Effect.gen(function* () {
		const stored = (yield* log.read(-1)).flatMap(({ event }) =>
			event.type === "ProviderEvent" && event.sessionId === opening.sessionId ? [event.event] : [],
		);
		const known = new Set(stored.flatMap((event) => (event.type === "subsession.opened" ? [event.subsessionRef] : [])));
		const recorded = new Set(stored.map((event) => event.raw.payload));
		const semantic = new Set(stored.map((event) => JSON.stringify(event)));
		const appendFresh = (events: ReadonlyArray<AgentEvent>) =>
			Effect.forEach(
				events,
				(event) => {
					const key = JSON.stringify(event);
					if (semantic.has(key)) return Effect.void;
					semantic.add(key);
					return record(entry, opening.sessionId, event, "audit");
				},
				{ discard: true },
			);
		if (nodeRef !== undefined) {
			yield* appendFresh(yield* backend.audit.node({ cwd: opening.options.cwd, nodeRef, rootRef, recorded: Effect.succeed([...recorded]) }));
			yield* log.append({ type: "SessionNodeAudited", sessionId: opening.sessionId, nodeRef });
		}
		const census = yield* backend.audit.census({ cwd: opening.options.cwd, rootRef, admitted: (node) => known.has(node) });
		yield* appendFresh(census.events);
		observeCensus(entry.activity, census.nodes);
		yield* log.append({ type: "SessionCensus", sessionId: opening.sessionId, nodes: census.nodes });
	}).pipe(
		Effect.ensuring(
			Effect.sync(() => {
				entry.activity.audits--;
			}),
		),
	);
});
