import { capacityObserved } from "@antumbra/domain-capacity/facts/observed.ts";
import { inputObserved } from "@antumbra/domain-inputs/facts/observed.ts";
import { ready } from "@antumbra/domain-reclamation/commands/ready.ts";
import { observed } from "@antumbra/domain-sessions/facts/observed.ts";
import { providerEvent } from "@antumbra/domain-sessions/facts/provider-event.ts";
import type { LogEntry } from "@antumbra/platform-runner/log.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { type ObservedFact, observation } from "@antumbra/server-journal/observe.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect, Option, Schema } from "effect";
import { inputObservation } from "#adapters/inputs/observation.ts";
import { providerEventObservation } from "#runner/provider-event.ts";
import { observation as resourceObservation } from "#runner/resources.ts";
import { observation as sessionObservation } from "#runner/session-observation.ts";

const translate = Effect.fn("RunnerLog.translatePostgres")(function* (entry: LogEntry) {
	const facts: ObservedFact[] = [];
	if (entry.event.type === "CapacityObserved")
		facts.push(observation(capacityObserved, yield* Schema.decodeUnknownEffect(capacityObserved.Payload)(entry.event)));
	const resource = resourceObservation(entry.event);
	if (Option.isSome(resource)) facts.push(resource.value);
	const session = sessionObservation(entry);
	if (session !== null) facts.push(observation(observed, session));
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
				? (yield* ExecutionHistory)
						.commit(ready, { agentId: entry.event.agentId, requestId: Request.make(entry.event.requestId) })
						.pipe(Effect.ignore)
				: Effect.void,
	};
});
export const appendPostgres = Effect.fn("RunnerLog.appendPostgres")(function* (input: {
	readonly logId: string;
	readonly entries: readonly LogEntry[];
}) {
	const entries = yield* Effect.forEach(input.entries, translate);
	return yield* (yield* ExecutionHistory).ingest({ logId: input.logId, entries });
});
