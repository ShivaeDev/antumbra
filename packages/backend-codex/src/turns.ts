import type { BackendFailure, SessionInput } from "@antumbra/plugin-api";
import { Deferred, Effect, Option, Ref, Schema, type Scope, Semaphore } from "effect";
import type { RpcNotification } from "#adapters/rpc.ts";
import type { AgentSettings } from "#agent-settings.ts";
import { TurnNotification } from "#protocol.ts";
import { makeQueuedTurns } from "#queued-turns.ts";
import type { CodexServer } from "#server.ts";
import { turnRequests } from "#turn-requests.ts";
import { idle, observeTurn, recordAcceptedTurn, requireOpen, SESSION_CLOSED, type TurnState, withoutTurn } from "#turn-state.ts";

interface TurnDriver {
	readonly interrupt: Effect.Effect<void, BackendFailure>;
	readonly queue: (input: SessionInput) => Effect.Effect<void, BackendFailure>;
	readonly steer: (input: SessionInput) => Effect.Effect<void, BackendFailure>;
	readonly track: (notification: RpcNotification) => Effect.Effect<void>;
}

const decodeTurnNotification = Schema.decodeUnknownOption(TurnNotification);

const turnIdIn = (notification: RpcNotification): Option.Option<string> =>
	Option.map(decodeTurnNotification(notification.params), ({ turn }) => turn.id);

// Codex exposes start, steer, and interrupt; queued delivery is local.
export const makeTurnDriver = (server: CodexServer, threadId: string, settings: AgentSettings): Effect.Effect<TurnDriver, never, Scope.Scope> =>
	Effect.gen(function* () {
		const state = yield* Ref.make<TurnState>(idle);
		const gate = yield* Semaphore.make(1);
		const requests = turnRequests(server, threadId, settings);
		const closure = yield* Deferred.make<never, BackendFailure>();
		const failWhenClosed = Deferred.await(closure);
		const queued = makeQueuedTurns(state, gate.withPermit, requests, failWhenClosed);
		const closeDelivery = Deferred.fail(closure, SESSION_CLOSED).pipe(Effect.andThen(queued.close), Effect.asVoid);
		yield* Effect.addFinalizer(() => closeDelivery);
		yield* Effect.forkScoped(server.exited.pipe(Effect.andThen(closeDelivery)));

		const startSteered = (input: SessionInput) => requests.start(input).pipe(Effect.flatMap((turnId) => recordAcceptedTurn(state, turnId)));

		const steerActive = (turnId: string, input: SessionInput) =>
			requests.steer(turnId, input).pipe(
				Effect.andThen(requireOpen(state)),
				Effect.catchTag("TurnNotSteerable", () => startSteered(input)),
			);

		const steerNow = (current: TurnState, input: SessionInput) =>
			current._tag === "closed"
				? Effect.fail(SESSION_CLOSED)
				: Option.match(current.turn, {
						onNone: () => startSteered(input),
						onSome: (turnId) => steerActive(turnId, input),
					});

		const steer = (input: SessionInput) =>
			Ref.get(state)
				.pipe(Effect.flatMap((current) => steerNow(current, input)))
				.pipe(gate.withPermit, Effect.raceFirst(failWhenClosed));

		const interrupt = Ref.get(state).pipe(
			Effect.flatMap((current) =>
				current._tag === "closed"
					? Effect.void
					: Option.match(current.turn, {
							onNone: () => Effect.void,
							onSome: requests.interrupt,
						}),
			),
		);

		const settled = gate.withPermit(
			Ref.update(state, (current) => (current._tag === "closed" ? current : withoutTurn(current))).pipe(
				Effect.andThen(queued.flush),
				Effect.catchCause((cause) => Effect.logWarning("codex: queued turn failed to start", cause)),
			),
		);

		const track = (notification: RpcNotification) => {
			switch (notification.method) {
				case "turn/started":
					return Option.match(turnIdIn(notification), {
						onNone: () => Effect.void,
						onSome: (turnId) => observeTurn(state, turnId),
					});
				case "turn/completed":
					return Option.isSome(turnIdIn(notification)) ? settled : Effect.void;
				default:
					return Effect.void;
			}
		};

		return {
			interrupt,
			queue: queued.queue,
			steer,
			track,
		} satisfies TurnDriver;
	});
