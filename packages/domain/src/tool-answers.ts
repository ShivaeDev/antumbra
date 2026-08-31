import type { DirectToolOutcome } from "@antumbra/plugin-api";
import { Effect, Option } from "effect";
import type { SessionIdentity } from "#tool-identity.ts";

export const refused = (text: string): DirectToolOutcome => ({
	ok: false,
	text,
});

export const onPiece = (identity: SessionIdentity, act: (pieceId: string) => Effect.Effect<DirectToolOutcome>): Effect.Effect<DirectToolOutcome> =>
	Option.match(identity.pieceId, {
		onNone: () => Effect.succeed(refused("you are not on a piece")),
		onSome: act,
	});

export const onVoyage = <E, R>(
	identity: SessionIdentity,
	act: (voyageId: string) => Effect.Effect<DirectToolOutcome, E, R>,
): Effect.Effect<DirectToolOutcome, E, R> =>
	Option.match(identity.voyageId, {
		onNone: () => Effect.succeed(refused("you are not on a voyage")),
		onSome: act,
	});

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
			onFailure: (error) => Effect.succeed(refused(`${name}: ${error}`)),
			onSuccess: (value) => Effect.succeed({ ok: true, text: say(value) }),
		}),
		Effect.catchCause((cause) => Effect.logWarning("agent tool died", { name }, cause).pipe(Effect.as(refused(`${name} could not be served`)))),
	);
