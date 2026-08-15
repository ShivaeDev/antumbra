import type { BackendFailure } from "@antumbra/plugin-api";
import { Effect, Option, Ref, Schema, Semaphore } from "effect";
import type { RpcNotification } from "#adapters/rpc.ts";
import { TurnNotification } from "#protocol.ts";
import type { CodexServer } from "#server.ts";
import { notSteerable, turnRequests } from "#turn-requests.ts";
import {
	idle,
	readyToFlush,
	type TurnState,
	withoutTurn,
	withPending,
	withTurn,
} from "#turn-state.ts";

export interface TurnDriver {
	readonly interrupt: Effect.Effect<void, BackendFailure>;
	readonly queue: (text: string) => Effect.Effect<void, BackendFailure>;
	readonly steer: (text: string) => Effect.Effect<void, BackendFailure>;
	readonly track: (notification: RpcNotification) => Effect.Effect<void>;
}

const decodeTurnNotification = Schema.decodeUnknownOption(TurnNotification);

const turnIdIn = (notification: RpcNotification): Option.Option<string> =>
	Option.map(
		decodeTurnNotification(notification.params),
		({ turn }) => turn.id,
	);

// why: codex has no queue of its own — a turn is started, steered, or
// interrupted, nothing else. Queue is ours: texts wait in `pending` while a
// turn is active and become the next turn's inputs when it completes; steer
// rides `turn/steer` against the active turn id and falls back to a fresh
// turn when the turn ended under it. One permit serialises all of it so a
// turn is never started twice.
export const makeTurnDriver = (
	server: CodexServer,
	threadId: string,
): Effect.Effect<TurnDriver> =>
	Effect.gen(function* () {
		const state = yield* Ref.make<TurnState>(idle);
		const gate = yield* Semaphore.make(1);
		const requests = turnRequests(server, threadId);

		const startTurn = (texts: ReadonlyArray<string>) =>
			requests
				.start(texts)
				.pipe(
					Effect.flatMap((turnId) =>
						Ref.set(state, { pending: [], turn: Option.some(turnId) }),
					),
				);

		const flush = Ref.get(state).pipe(
			Effect.flatMap((current) =>
				readyToFlush(current) ? startTurn(current.pending) : Effect.void,
			),
		);

		const queue = (text: string) =>
			gate.withPermit(
				Ref.update(state, (current) => withPending(current, text)).pipe(
					Effect.andThen(flush),
				),
			);

		const steerNow = (current: TurnState, text: string) =>
			Option.match(current.turn, {
				onNone: () => startTurn([text]),
				onSome: (turnId) =>
					requests
						.steer(turnId, text)
						.pipe(Effect.catchIf(notSteerable, () => startTurn([text]))),
			});

		const steer = (text: string) =>
			gate.withPermit(
				Ref.get(state).pipe(
					Effect.flatMap((current) => steerNow(current, text)),
				),
			);

		const interrupt = Ref.get(state).pipe(
			Effect.flatMap((current) =>
				Option.match(current.turn, {
					onNone: () => Effect.void,
					onSome: requests.interrupt,
				}),
			),
		);

		const settled = gate.withPermit(
			Ref.update(state, withoutTurn).pipe(
				Effect.andThen(flush),
				Effect.catchCause((cause) =>
					Effect.logWarning("codex: queued turn failed to start", cause),
				),
			),
		);

		const track = (notification: RpcNotification) => {
			switch (notification.method) {
				case "turn/started":
					return Option.match(turnIdIn(notification), {
						onNone: () => Effect.void,
						onSome: (turnId) =>
							Ref.update(state, (current) => withTurn(current, turnId)),
					});
				case "turn/completed":
					return Option.isSome(turnIdIn(notification)) ? settled : Effect.void;
				default:
					return Effect.void;
			}
		};

		return { interrupt, queue, steer, track } satisfies TurnDriver;
	});
