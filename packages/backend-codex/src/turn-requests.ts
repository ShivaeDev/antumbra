import type { BackendFailure, SessionInput } from "@antumbra/plugin-api";
import { Data, Effect, Option, Schema } from "effect";
import type { AgentSettings } from "#agent-settings.ts";
import { codexFailure } from "#failure.ts";
import { TurnResponse } from "#protocol.ts";
import type { CodexServer } from "#server.ts";

const INTERRUPT_TIMEOUT_MS = 5_000;

const decodeTurnResponse = Schema.decodeUnknownOption(TurnResponse);

const userInput = (input: SessionInput) =>
	input.parts.map((part) => (part.type === "text" ? { text: part.text, text_elements: [], type: "text" } : { path: part.path, type: "localImage" }));

const turnIdOf = (response: unknown) =>
	Option.match(decodeTurnResponse(response), {
		onNone: () => Effect.fail(codexFailure("turn/start returned no turn")),
		onSome: ({ turn }) => Effect.succeed(turn.id),
	});

class TurnNotSteerable extends Data.TaggedError("TurnNotSteerable") {}

const decodeFailureDetail = Schema.decodeUnknownOption(
	Schema.TemplateLiteralParser([
		Schema.String,
		Schema.Literals(["no active turn", "expected active turn id", "timeout waiting"]).transform([
			"noActiveTurn",
			"expectedActiveTurnId",
			"timeoutWhileDraining",
		]),
		Schema.String,
	]),
);

const turnFailureKind = (failure: BackendFailure) =>
	Option.match(decodeFailureDetail(failure.detail), {
		onNone: () => "other" as const,
		onSome: ([, kind]) => kind,
	});

const nothingToInterrupt = (failure: BackendFailure): boolean => {
	const kind = turnFailureKind(failure);
	return kind === "noActiveTurn" || kind === "timeoutWhileDraining";
};

export interface TurnRequests {
	readonly interrupt: (turnId: string) => Effect.Effect<void, BackendFailure>;
	readonly start: (input: SessionInput) => Effect.Effect<string, BackendFailure>;
	readonly steer: (turnId: string, input: SessionInput) => Effect.Effect<void, BackendFailure | TurnNotSteerable>;
}

// A timeout while residual work drains still means the turn is no longer
// running, so the interrupt is successful.
export const turnRequests = (server: CodexServer, threadId: string, settings: AgentSettings): TurnRequests => ({
	interrupt: (turnId) =>
		server.request("turn/interrupt", { threadId, turnId }, INTERRUPT_TIMEOUT_MS).pipe(
			Effect.asVoid,
			Effect.catchIf(nothingToInterrupt, () => Effect.void),
		),
	start: (input) =>
		server
			.request("turn/start", {
				clientUserMessageId: input.id,
				input: userInput(input),
				threadId,
				...settings,
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
			.pipe(
				Effect.asVoid,
				Effect.mapError((failure) => {
					const kind = turnFailureKind(failure);
					return kind === "noActiveTurn" || kind === "expectedActiveTurnId" ? new TurnNotSteerable() : failure;
				}),
			),
});
