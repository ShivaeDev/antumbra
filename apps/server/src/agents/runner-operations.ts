import { RunnerOperations, type StartOrder } from "@antumbra/domain-agents/ports/runner-operations.ts";
import { RunnerOperations as RunnerDispatch } from "@antumbra/platform-runner/dispatch.ts";
import { Effect, Layer, Option, Stream } from "effect";
import { Reactivity } from "effect/unstable/reactivity/Reactivity";

export const runnerOperations = Layer.effect(
	RunnerOperations,
	Effect.gen(function* () {
		const runners = yield* RunnerDispatch;
		const reactivity = yield* Reactivity;
		return {
			runnerFor: (backend: string) =>
				reactivity.stream(["runner:connected"], runners.connected).pipe(
					Stream.map((connected) => connected.find((candidate) => candidate.backends.includes(backend))),
					Stream.filter((candidate) => candidate !== undefined),
					Stream.runHead,
					Effect.map((found) => Option.getOrThrow(found).runnerId),
				),
			start: (runnerId: string, order: StartOrder) =>
				runners
					.execute(runnerId, {
						type: "Start",
						requestId: order.requestId,
						sessionId: order.sessionId,
						options: {
							agentId: order.agentId,
							backend: order.backend,
							cwd: order.cwd,
							model: order.model,
							effort: order.effort,
							constrainedPrompt: order.constrainedPrompt,
							toolSet: order.toolSet,
						},
						charter: { id: order.charterId, parts: [{ type: "text", text: order.charter }] },
					})
					.pipe(Effect.map((result) => (result.type === "Refused" ? result.reason : null))),
		};
	}),
);
