import type { DirectToolOutcome } from "@antumbra/plugin-api";
import { Effect, Option } from "effect";
import type { SessionIdentity } from "#tool-identity.ts";

export const refused = (text: string): DirectToolOutcome => ({
	ok: false,
	text,
});

// why: agents hailed by hand answer to no piece, so an outcome has nothing to
// land against — the tool says so rather than inventing one.
export const onPiece = (identity: SessionIdentity, act: (pieceId: string) => Effect.Effect<DirectToolOutcome>): Effect.Effect<DirectToolOutcome> =>
	Option.match(identity.pieceId, {
		onNone: () => Effect.succeed(refused("you are not on a piece")),
		onSome: act,
	});

// why: a captain acts on the voyage it was hailed for and on nothing else,
// so the voyage is never an argument a call could get wrong.
export const onVoyage = <E, R>(
	identity: SessionIdentity,
	act: (voyageId: string) => Effect.Effect<DirectToolOutcome, E, R>,
): Effect.Effect<DirectToolOutcome, E, R> =>
	Option.match(identity.voyageId, {
		onNone: () => Effect.succeed(refused("you are not on a voyage")),
		onSome: act,
	});

// why: the harness already logs every call as a tool item, so the transcript
// needs nothing from here — debug is for the times the two disagree.
export const called = (identity: SessionIdentity, name: string) =>
	Effect.logDebug("agent tool called", {
		agentId: identity.agentId,
		name,
		sessionId: identity.sessionId,
	});

export const answered = <A>(
	identity: SessionIdentity,
	name: string,
	act: Effect.Effect<A, unknown>,
	say: (value: A) => string,
): Effect.Effect<DirectToolOutcome> =>
	called(identity, name).pipe(
		Effect.andThen(act),
		Effect.matchEffect({
			// why: an expected failure is the agent's business — a missing piece
			// is something it can read and act on — while a defect is ours, so it
			// goes to the log and the agent hears only that the tool did not serve.
			onFailure: (error) => Effect.succeed(refused(`${name}: ${error}`)),
			onSuccess: (value) => Effect.succeed({ ok: true, text: say(value) }),
		}),
		Effect.catchCause((cause) => Effect.logWarning("agent tool died", { name }, cause).pipe(Effect.as(refused(`${name} could not be served`)))),
	);
