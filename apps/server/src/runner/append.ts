import { capacityObserved } from "@antumbra/domain-capacity/facts/observed.ts";
import { inputObserved } from "@antumbra/domain-inputs/facts/observed.ts";
import { ready } from "@antumbra/domain-reclamation/commands/ready.ts";
import { observed } from "@antumbra/domain-sessions/facts/observed.ts";
import { providerEvent } from "@antumbra/domain-sessions/facts/provider-event.ts";
import type { LogEntry, LogEvent } from "@antumbra/platform-runner/log.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit, type CommitService } from "@antumbra/server-journal/commit.ts";
import { type ObservedFact, observation } from "@antumbra/server-journal/observe.ts";
import { Effect, Option, Schema } from "effect";
import { inputObservation } from "#adapters/inputs/observation.ts";
import { providerEventObservation } from "#runner/provider-event.ts";
import { observation as resourceObservation } from "#runner/resources.ts";
import { observation as sessionObservation } from "#runner/session-observation.ts";

const moored = (commit: CommitService, event: LogEvent): Effect.Effect<void> =>
	event.type === "MoorageProvisioned"
		? Effect.ignore(commit.commit(ready, { agentId: event.agentId, requestId: Request.make(event.requestId) }))
		: Effect.void;

export const append = Effect.fn("RunnerLog.append")(function* (input: { readonly logId: string; readonly entries: readonly LogEntry[] }) {
	const commit = yield* Commit;
	for (const entry of input.entries) {
		yield* moored(commit, entry.event);
		const facts: ObservedFact[] = [];
		if (entry.event.type === "CapacityObserved") {
			const payload = yield* Schema.decodeUnknownEffect(capacityObserved.Payload)(entry.event).pipe(Effect.orDie);
			facts.push(observation(capacityObserved, payload));
		}
		const resource = resourceObservation(entry.event);
		if (Option.isSome(resource)) facts.push(resource.value);
		const session = sessionObservation(entry);
		if (session !== null) facts.push(observation(observed, session));
		const provider = providerEventObservation(entry);
		if (provider !== null) facts.push(observation(providerEvent, provider));
		const delivery = inputObservation(entry);
		if (delivery !== null) facts.push(observation(inputObserved, delivery));
		yield* commit.observeBatch(
			{
				logId: input.logId,
				cursor: entry.cursor,
				at: entry.at,
				requestId: Request.make(`runner:${input.logId}:${entry.cursor}`),
			},
			facts,
		);
	}
	return yield* commit.cursor(input.logId);
});
