import type { BackendFailure, SessionInput } from "@antumbra/plugin-api";
import { Effect, Option, Schema } from "effect";
import { codexFailure } from "#failure.ts";
import { TurnResponse } from "#protocol.ts";
import type { CodexServer } from "#server.ts";

const INTERRUPT_TIMEOUT_MS = 5_000;

const decodeTurnResponse = Schema.decodeUnknownOption(TurnResponse);

const userInput = (input: SessionInput) =>
	input.parts.map((part) =>
		part.type === "text"
			? { text: part.text, text_elements: [], type: "text" }
			: { path: part.path, type: "localImage" },
	);

const turnIdOf = (response: unknown) =>
	Option.match(decodeTurnResponse(response), {
		onNone: () => Effect.fail(codexFailure("turn/start returned no turn")),
		onSome: ({ turn }) => Effect.succeed(turn.id),
	});

export const notSteerable = (failure: BackendFailure): boolean =>
	failure.detail.includes("no active turn") ||
	failure.detail.includes("expected active turn id");

const nothingToInterrupt = (failure: BackendFailure): boolean =>
	failure.detail.includes("no active turn") ||
	failure.detail.includes("timeout waiting");

export interface TurnRequests {
	readonly interrupt: (turnId: string) => Effect.Effect<void, BackendFailure>;
	readonly start: (
		input: SessionInput,
	) => Effect.Effect<string, BackendFailure>;
	readonly steer: (
		turnId: string,
		input: SessionInput,
	) => Effect.Effect<void, BackendFailure>;
}

// why: the three turn verbs app-server actually has, one thread's worth.
// Interrupt is measured to hang while residual work is in flight and to
// fail once the turn already ended — both mean the turn is not running, so
// both count as done.
export const turnRequests = (
	server: CodexServer,
	threadId: string,
): TurnRequests => ({
	interrupt: (turnId) =>
		server
			.request("turn/interrupt", { threadId, turnId }, INTERRUPT_TIMEOUT_MS)
			.pipe(
				Effect.asVoid,
				Effect.catchIf(nothingToInterrupt, () => Effect.void),
			),
	start: (input) =>
		server
			.request("turn/start", {
				clientUserMessageId: input.id,
				input: userInput(input),
				threadId,
			})
			.pipe(Effect.flatMap(turnIdOf)),
	steer: (turnId, input) =>
		server
			.request("turn/steer", {
				clientUserMessageId: input.id,
				expectedTurnId: turnId,
				input: userInput(input),
				threadId,
			})
			.pipe(Effect.asVoid),
});
