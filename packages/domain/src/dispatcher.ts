import { SettingsSource } from "@antumbra/contract";
import { DomainFeeds, pump } from "@antumbra/domain-feeds";
import { Kernel } from "@antumbra/kernel";
import { Database, type WriteExecutors } from "@antumbra/persistence";
import { Clock, Effect, Layer, Option, Queue, Ref } from "effect";
import { AGENTS_ALIVE_GAUGE, AgentDomain } from "#agent-domain-service.ts";
import { readyPieces } from "#dispatch-policy.ts";
import { type DispatchPort, dispatchPiece } from "#dispatch-spawn.ts";
import { dispatchable, makeDispatchState } from "#dispatch-state.ts";
import { assignedExecution } from "#voyage-execution-selection.ts";
import { VoyageWorldSource } from "#voyage-world.ts";

export interface DispatcherOptions {
	readonly maxAlive?: number;
	readonly patienceMillis: number;
}

const DEFAULTS = { patienceMillis: 5000 } as const;

const onePass = (
	port: DispatchPort,
	maxAlive: number | undefined,
	aliveAgents: Effect.Effect<number, unknown>,
) =>
	Effect.gen(function* () {
		const source = yield* VoyageWorldSource;
		const settings = yield* SettingsSource;
		const effectiveMaxAlive =
			maxAlive ?? (yield* settings.current).maxParallelSessions;
		const now = yield* Clock.currentTimeMillis;
		const world = yield* source.read;
		const allowed = yield* dispatchable(port.state, now);
		const inFlight = (yield* Ref.get(port.state.inFlight)).size;
		let budget = effectiveMaxAlive - (yield* aliveAgents) - inFlight;
		for (const candidate of readyPieces(world)) {
			if (!allowed(candidate.piece.id)) {
				continue;
			}
			const assigned = assignedExecution(world, candidate.piece.id);
			if (assigned._tag === "unavailable") {
				yield* Effect.logWarning("assigned Agent has no idle current Session", {
					agentId: assigned.agentId,
					pieceId: candidate.piece.id,
				});
				continue;
			}
			if (assigned._tag === "resume") {
				yield* dispatchPiece(port, candidate, {
					_tag: "resume",
					sessionId: assigned.sessionId,
				}).pipe(
					Effect.annotateSpans({
						agentId: assigned.agentId,
						pieceId: candidate.piece.id,
						sessionId: assigned.sessionId,
					}),
				);
				continue;
			}
			if (budget > 0) {
				yield* dispatchPiece(port, candidate, { _tag: "spawn" }).pipe(
					Effect.annotateSpans({ pieceId: candidate.piece.id }),
				);
				budget -= 1;
			}
		}
	});

// why: a failed pass must never kill the dispatcher — the pool would keep
// filling with ready pieces nobody spawns for. Log the cause and wait for the
// next tick, exactly as the kernel's drain does.
const guarded = <A, R>(pass: Effect.Effect<A, unknown, R>) =>
	pass.pipe(
		Effect.catchCause((cause) =>
			Effect.logError("dispatcher pass failed", cause),
		),
	);

const dispatchLoop = (
	port: DispatchPort,
	options: DispatcherOptions,
	aliveAgents: Effect.Effect<number, unknown>,
) =>
	Effect.gen(function* () {
		// why: every wait is bounded by the patience floor, so a wake signal is a
		// latency hint and never a liveness dependency — a lost one self-heals
		// within one patience period.
		while (true) {
			yield* Effect.timeoutOption(
				Queue.take(port.state.tick),
				options.patienceMillis,
			);
			yield* guarded(onePass(port, options.maxAlive, aliveAgents));
		}
	});

export const DispatcherLive = (overrides: Partial<DispatcherOptions> = {}) =>
	Layer.effectDiscard(
		Effect.gen(function* () {
			const options = { ...DEFAULTS, ...overrides };
			const domain = yield* AgentDomain;
			const feeds = yield* DomainFeeds;
			const kernel = yield* Kernel;
			const db = yield* Database;
			const executors = yield* Effect.context<WriteExecutors>();
			const state = yield* makeDispatchState;
			const port: DispatchPort = {
				patienceMillis: options.patienceMillis,
				state,
				resume: (sessionId) => kernel.submit(domain.recover, { sessionId }),
				submit: (payload) => kernel.submit(domain.spawn, payload),
			};
			const aliveAgents = Option.getOrElse(
				Option.fromUndefinedOr(domain.gauges[AGENTS_ALIVE_GAUGE]),
				() => Effect.succeed(0),
			);
			yield* Effect.forkScoped(
				dispatchLoop(port, options, aliveAgents).pipe(
					Effect.provideService(Database, db),
					Effect.provideContext(executors),
				),
			);
			yield* Effect.forkScoped(pump(feeds.fleet, state.tick));
			yield* Effect.forkScoped(pump(feeds.voyages, state.tick));
			yield* Queue.offer(state.tick, undefined);
		}),
	);
