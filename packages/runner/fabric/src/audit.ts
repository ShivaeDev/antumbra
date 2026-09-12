import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
import { Effect } from "effect";
import { observeCensus } from "#activity.ts";
import { RunnerLog } from "#log.ts";
import { BackendRegistry } from "#ports.ts";
import type { Attachment } from "#state.ts";

interface AuditTarget {
	readonly sessionId: string;
	readonly options: { readonly backend: string; readonly cwd: string };
}

export const audit = Effect.fn("RunnerFabric.audit")(function* (
	entry: Attachment | undefined,
	opening: AuditTarget,
	rootRef: string,
	nodeRef?: string,
) {
	const log = yield* RunnerLog;
	const registry = yield* BackendRegistry;
	const backend = registry.backends.get(opening.options.backend);
	if (backend === undefined) return yield* Effect.die("attached backend missing");
	if (entry !== undefined) entry.activity.audits++;
	yield* Effect.gen(function* () {
		const stored = (yield* log.read(-1)).flatMap(({ event }) =>
			event.type === "ProviderEvent" && event.sessionId === opening.sessionId ? [event.event] : [],
		);
		const known = new Set(stored.flatMap((event) => (event.type === "subsession.opened" ? [event.subsessionRef] : [])));
		const recorded = new Set(stored.map((event) => event.raw.payload));
		const semantic = new Set(stored.map((event) => JSON.stringify(event)));
		const node = stored.find((event) => event.type === "subsession.opened" && event.subsessionRef === nodeRef);
		const origin = node?.type === "subsession.opened" ? { node: node.subsessionRef, spawnedBy: node.spawnedBy } : undefined;
		const appendFresh = (events: ReadonlyArray<AgentEvent>, attribute = false) =>
			Effect.forEach(
				events,
				(finding) => {
					const event =
						attribute &&
						origin !== undefined &&
						finding.type !== "rate.limit" &&
						finding.type !== "session.opened" &&
						finding.type !== "subsession.opened" &&
						finding.type !== "subsession.ended" &&
						finding.origin === undefined
							? { ...finding, origin }
							: finding;
					const key = JSON.stringify(event);
					if (semantic.has(key)) return Effect.void;
					semantic.add(key);
					return log.append({ type: "ProviderEvent", sessionId: opening.sessionId, event, observation: "audit" });
				},
				{ discard: true },
			);
		if (nodeRef !== undefined) {
			yield* appendFresh(yield* backend.audit.node({ cwd: opening.options.cwd, nodeRef, rootRef, recorded: Effect.succeed([...recorded]) }), true);
			yield* log.append({ type: "SessionNodeAudited", sessionId: opening.sessionId, nodeRef });
		}
		const census = yield* backend.audit.census({ cwd: opening.options.cwd, rootRef, admitted: (node) => known.has(node) });
		yield* appendFresh(census.events);
		if (entry !== undefined) observeCensus(entry.activity, census.nodes);
		yield* log.append({ type: "SessionCensus", sessionId: opening.sessionId, nodes: census.nodes });
	}).pipe(
		Effect.ensuring(
			Effect.sync(() => {
				if (entry !== undefined) entry.activity.audits--;
			}),
		),
	);
});
