import { capacityObserved } from "@antumbra/domain-capacity/facts/observed.ts";
import { inputObserved } from "@antumbra/domain-inputs/facts/observed.ts";
import { observed } from "@antumbra/domain-sessions/facts/observed.ts";
import { providerEvent } from "@antumbra/domain-sessions/facts/provider-event.ts";
import type { LogEntry } from "@antumbra/platform-runner/log.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Reclamation } from "@antumbra/server-reclamation/service.ts";
import { ExecutionHistory } from "@antumbra/server-storage/execution/service.ts";
import { type ObservedFact, observation } from "@antumbra/server-storage/observe.ts";
import { Effect, Option, Schema } from "effect";
import { inputObservation } from "#adapters/inputs/observation.ts";
import { RunnerConnections } from "#runner/connections.ts";
import { providerEventObservation } from "#runner/provider-event.ts";
import type { Reported } from "#runner/reported.ts";
import { observation as resourceObservation } from "#runner/resources.ts";
import { observation as sessionObservation } from "#runner/session-observation.ts";

const translate = Effect.fn("RunnerLog.translatePostgres")(function* (entry: LogEntry, reported: Reported) {
	const reclamationService = yield* Reclamation;

	const facts: ObservedFact[] = [];
	if (entry.event.type === "CapacityObserved")
		facts.push(observation(capacityObserved, yield* Schema.decodeUnknownEffect(capacityObserved.Payload)(entry.event)));
	const resource = resourceObservation(entry.event);
	if (Option.isSome(resource)) facts.push(resource.value);
	const session = sessionObservation(entry);
	if (session !== null && reported.news(session)) facts.push(observation(observed, session));
	if (session !== null) reported.landed(session);
	const provider = providerEventObservation(entry);
	if (provider !== null) facts.push(observation(providerEvent, provider));
	const delivery = inputObservation(entry);
	if (delivery !== null) facts.push(observation(inputObserved, delivery));
	return {
		cursor: entry.cursor,
		at: entry.at,
		facts,
		before:
			entry.event.type === "MoorageProvisioned"
				? reclamationService.ready({ agentId: entry.event.agentId, requestId: Request.make(entry.event.requestId) }).pipe(Effect.ignore)
				: Effect.void,
	};
});
export const append = Effect.fn("RunnerLog.append")(function* (input: { readonly logId: string; readonly entries: readonly LogEntry[] }) {
	const history = yield* ExecutionHistory;
	const connections = yield* RunnerConnections;
	const preview = yield* connections.preview(input.logId);
	const entries = yield* Effect.forEach(input.entries, (entry) => translate(entry, preview));
	const cursor = yield* history.ingest({ logId: input.logId, entries });
	for (const entry of input.entries) {
		const session = sessionObservation(entry);
		if (session !== null) yield* connections.landed(input.logId, session);
	}
	return cursor;
});
