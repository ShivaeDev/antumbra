import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import { reconcilers } from "@antumbra/server-journal/reconcilers.ts";
import { Context, Effect, Fiber, Layer, Stream } from "effect";
import { Reactivity } from "effect/unstable/reactivity/Reactivity";
import { watchChanges } from "#changes/watch.ts";
import { features } from "#features.ts";
import { reconcile as mail } from "#mail/reconcile.ts";
import { reconcile as resources } from "#resources/reconcile.ts";
import { audit } from "#sessions/audit.ts";
import { resumeCapacity } from "#sessions/capacity.ts";
import { reconcile as sessions } from "#sessions/reconcile.ts";
import { prepareSmoother } from "#smoothing/prepare.ts";
import { smoothing } from "#smoothing/run.ts";
import { runtime as starts } from "#starts/runtime.ts";
import { rulingReconciliation } from "#tools/rulings/reconciliation.ts";
import { openFlagship } from "#voyages/flagship.ts";

export class ServerRuntime extends Context.Service<ServerRuntime, { readonly await: Effect.Effect<void> }>()("@antumbra/server/Runtime") {}

export const runtime = Layer.effect(
	ServerRuntime,
	Effect.gen(function* () {
		const runners = yield* RunnerOperations;
		const reactivity = yield* Reactivity;
		yield* openFlagship;
		const workers = yield* Effect.all([
			starts,
			sessions(),
			audit(),
			resumeCapacity(),
			resources(),
			mail(),
			watchChanges,
			rulingReconciliation,
			reconcilers(features),
		]);
		const reconnect = reactivity
			.stream(["runner:connected"], runners.connected)
			.pipe(Stream.runForEach(() => Effect.forEach(workers, (worker) => worker.refresh, { discard: true })));
		const supervisor = yield* Effect.forkScoped(
			Effect.raceAllFirst([...workers.map((worker) => worker.await), reconnect, smoothing(prepareSmoother)]),
		);
		return { await: Fiber.join(supervisor) };
	}),
);
