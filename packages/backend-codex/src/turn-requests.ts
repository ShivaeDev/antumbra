import type { BackendFailure } from "@antumbra/plugin-api";
import { Effect, Option, Schema } from "effect";
import { codexFailure } from "#failure.ts";
import { TurnResponse } from "#protocol.ts";
import type { CodexServer } from "#server.ts";

const INTERRUPT_TIMEOUT_MS = 5_000;

const decodeTurnResponse = Schema.decodeUnknownOption(TurnResponse);

const textInput = (texts: ReadonlyArray<string>) =>
	texts.map((text) => ({ text, text_elements: [], type: "text" }));

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
		texts: ReadonlyArray<string>,
	) => Effect.Effect<string, BackendFailure>;
	readonly steer: (
		turnId: string,
		text: string,
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
	start: (texts) =>
		server
			.request("turn/start", { input: textInput(texts), threadId })
			.pipe(Effect.flatMap(turnIdOf)),
	steer: (turnId, text) =>
		server
			.request("turn/steer", {
				expectedTurnId: turnId,
				input: textInput([text]),
				threadId,
			})
			.pipe(Effect.asVoid),
});
