import { Kernel } from "@antumbra/kernel";
import { Database, type WriteExecutors } from "@antumbra/persistence";
import {
	Clock,
	Effect,
	Layer,
	Option,
	PubSub,
	Queue,
	Ref,
	Stream,
} from "effect";
import { readyPieces } from "#dispatch-policy.ts";
import { type DispatchPort, dispatchPiece } from "#dispatch-spawn.ts";
import { dispatchable, makeDispatchState } from "#dispatch-state.ts";
import { AGENTS_ALIVE_GAUGE, AgentDomain } from "#domain.ts";
import { voyageWorld } from "#voyage-world.ts";

export interface DispatcherOptions {
	readonly maxAlive: number;
	readonly patienceMillis: number;
}

const DEFAULTS: DispatcherOptions = { maxAlive: 4, patienceMillis: 5000 };

const onePass = (
	port: DispatchPort,
	maxAlive: number,
	aliveAgents: Effect.Effect<number>,
) =>
	Effect.gen(function* () {
		const now = yield* Clock.currentTimeMillis;
		const world = yield* voyageWorld(port.db);
		const allowed = yield* dispatchable(port.state, now);
		const inFlight = (yield* Ref.get(port.state.inFlight)).size;
		let budget = maxAlive - (yield* aliveAgents) - inFlight;
		for (const candidate of readyPieces(world)) {
			if (budget <= 0) {
				return;
			}
			if (allowed(candidate.piece.id)) {
				yield* dispatchPiece(port, candidate);
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
	aliveAgents: Effect.Effect<number>,
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

const pump = (feed: PubSub.PubSub<void>, tick: Queue.Queue<void>) =>
	Effect.gen(function* () {
		const subscription = yield* PubSub.subscribe(feed);
		yield* Stream.fromSubscription(subscription).pipe(
			Stream.runForEach(() => Queue.offer(tick, undefined)),
		);
	}).pipe(Effect.scoped);

export const DispatcherLive = (overrides: Partial<DispatcherOptions> = {}) =>
	Layer.effectDiscard(
		Effect.gen(function* () {
			const options = { ...DEFAULTS, ...overrides };
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			const db = yield* Database;
			const executors = yield* Effect.context<WriteExecutors>();
			const state = yield* makeDispatchState;
			const port: DispatchPort = {
				db,
				patienceMillis: options.patienceMillis,
				state,
				submit: (payload) => kernel.submit(domain.spawn, payload),
			};
			const aliveAgents = Option.getOrElse(
				Option.fromUndefinedOr(domain.gauges[AGENTS_ALIVE_GAUGE]),
				() => Effect.succeed(0),
			);
			yield* Effect.forkScoped(
				Effect.provideContext(
					dispatchLoop(port, options, aliveAgents),
					executors,
				),
			);
			yield* Effect.forkScoped(pump(domain.feeds.fleet, state.tick));
			yield* Effect.forkScoped(pump(domain.feeds.voyages, state.tick));
			yield* Queue.offer(state.tick, undefined);
		}),
	);
