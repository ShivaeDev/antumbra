import { makeBackendCapacityController } from "@antumbra/runner-ports/backend-capacity.ts";
import { noSessionAudit } from "@antumbra/runner-ports/session-audit.ts";
import { expect, it } from "@effect/vitest";
import { Effect, Layer, Option, Stream } from "effect";
import { layer } from "#capacity.ts";
import { RunnerLog } from "#log.ts";
import { BackendRegistry } from "#ports.ts";
import { file } from "#test/database.ts";

it.effect("appends provider capacity evidence from the registered source", () =>
	Effect.gen(function* () {
		const controller = yield* makeBackendCapacityController(() =>
			Option.some({ status: "blocked", reason: "usage-limit", detail: "provider limit" }),
		);
		const dependencies = Layer.mergeAll(
			file({ filename: ":memory:", seed: "log" }),
			Layer.succeed(BackendRegistry, {
				backends: new Map([
					[
						"scripted",
						{
							tag: "scripted",
							capacity: controller.source,
							capabilities: { imageInput: false },
							audit: noSessionAudit,
							listModels: Effect.succeed([]),
							openSession: () => Effect.die("unused"),
						},
					],
				]),
			}),
		);
		controller.observe({ source: "scripted", kind: "rate", payload: "limited" }, 42);
		yield* Effect.gen(function* () {
			const log = yield* RunnerLog;
			const entries = yield* log.events(-1).pipe(Stream.take(1), Stream.runCollect);
			expect(entries[0]?.event).toEqual({
				type: "CapacityObserved",
				backend: "scripted",
				status: "blocked",
				reason: "usage-limit",
				detail: "provider limit",
				observedAt: 42,
				resetsAt: null,
				utilization: null,
			});
		}).pipe(Effect.provide(layer.pipe(Layer.provideMerge(dependencies))));
	}),
);
