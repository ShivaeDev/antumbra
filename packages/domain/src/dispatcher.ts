import { holding, SettingsSource } from "@antumbra/contract";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Kernel } from "@antumbra/kernel";
import { Clock, Effect, Layer, Queue } from "effect";
import { agentsAtWork } from "#agent-at-work.ts";
import { AgentDomain } from "#agent-domain-service.ts";
import { dispatchCandidate, pendingDispatches } from "#dispatch-candidate-selection.ts";
import { readyPieces } from "#dispatch-policy.ts";
import type { DispatchPort } from "#dispatch-spawn.ts";
import { dispatchable, makeDispatchState } from "#dispatch-state.ts";
import { ExecutionSource } from "#execution/service.ts";
import { runRefreshes } from "#feed-refreshes.ts";
import { assignedExecution } from "#voyage-execution-selection.ts";

export interface DispatcherOptions {
	readonly maxRunning?: number;
	readonly patienceMillis: number;
}

const DEFAULTS = { patienceMillis: 5000 } as const;

const onePass = (port: DispatchPort, maxRunning: number | undefined) =>
	Effect.gen(function* () {
		const settings = yield* SettingsSource;
		const { settings: chosen } = yield* settings.current;
		if (holding(chosen, "dispatch")) {
			return;
		}
		const source = yield* ExecutionSource;
		const effectiveMaxRunning = maxRunning ?? chosen.maxParallelSessions;
		const now = yield* Clock.currentTimeMillis;
		const world = yield* source.dispatch();
		const allowed = yield* dispatchable(port.state, now);
		const pending = yield* pendingDispatches;
		let budget = effectiveMaxRunning - agentsAtWork(world) - pending.pieceIds.size;
		for (const candidate of readyPieces(world)) {
			if (!allowed(candidate.piece.id)) {
				continue;
			}
			budget = yield* dispatchCandidate(port, candidate, assignedExecution(world, candidate.piece.id), budget, pending);
		}
	});
const dispatchLoop = (port: DispatchPort, options: DispatcherOptions) =>
	Effect.gen(function* () {
		while (true) {
			yield* Effect.timeoutOption(Queue.take(port.state.tick), options.patienceMillis);
			yield* onePass(port, options.maxRunning);
		}
	});

export const DispatcherLive = (overrides: Partial<DispatcherOptions> = {}) =>
	Layer.effectDiscard(
		Effect.gen(function* () {
			const options = { ...DEFAULTS, ...overrides };
			const domain = yield* AgentDomain;
			const feeds = yield* DomainFeeds;
			const kernel = yield* Kernel;
			const state = yield* makeDispatchState;
			const port: DispatchPort = {
				patienceMillis: options.patienceMillis,
				state,
				resume: (sessionId) => kernel.submit(domain.wake, { sessionId }),
				submit: (payload) => kernel.submit(domain.spawn, payload),
			};
			yield* Effect.forkScoped(dispatchLoop(port, options));
			yield* Effect.forkScoped(runRefreshes(feeds.subscribeFleetRefresh(), state.tick));
			yield* Effect.forkScoped(runRefreshes(feeds.subscribeVoyageRefresh(), state.tick));
			yield* Queue.offer(state.tick, undefined);
		}),
	);
