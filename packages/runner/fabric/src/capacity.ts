import { Effect, Layer, Option, Stream } from "effect";
import { RunnerLog } from "#log.ts";
import { BackendRegistry } from "#ports.ts";

export const layer = Layer.effectDiscard(
	Effect.gen(function* () {
		const registry = yield* BackendRegistry;
		const log = yield* RunnerLog;
		for (const backend of registry.backends.values()) {
			const source = backend.capacity;
			if (source === undefined) continue;
			yield* source.states.pipe(
				Stream.filter(Option.isSome),
				Stream.map((value) => value.value),
				Stream.runForEach((value) =>
					log.append({
						type: "CapacityObserved",
						backend: backend.tag,
						status: value.status,
						observedAt: value.observedAt,
						reason: value.status === "available" ? null : value.reason,
						detail: value.status === "available" ? null : value.detail,
						resetsAt: value.status === "available" ? null : (value.resetsAt ?? null),
						utilization: value.status === "available" ? null : (value.utilization ?? null),
					}),
				),
				Effect.forkScoped,
			);
		}
	}),
);
