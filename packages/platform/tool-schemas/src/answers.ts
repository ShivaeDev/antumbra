import type { ToolAnswer } from "@antumbra/platform-vocabulary/tool-answer.ts";
import { Effect } from "effect";
import type { ToolContext } from "#context.ts";

export const refused = (text: string): ToolAnswer => ({ ok: false, text });

export const answered = <Value, Failure, Requirements>(
	context: ToolContext,
	name: string,
	act: Effect.Effect<Value, Failure, Requirements>,
	say: (value: Value) => string,
): Effect.Effect<ToolAnswer, never, Requirements> =>
	Effect.logDebug("agent tool called", { agentId: context.agentId, name, sessionId: context.sessionId }).pipe(
		Effect.andThen(act),
		Effect.matchEffect({
			onFailure: (error) => Effect.succeed(refused(`${name}: ${error}`)),
			onSuccess: (value) => Effect.succeed({ ok: true, text: say(value) }),
		}),
		Effect.catchCause((cause) => Effect.logWarning("agent tool died", { name }, cause).pipe(Effect.as(refused(`${name} could not be served`)))),
	);

export const onPiece = <Failure, Requirements>(
	context: ToolContext,
	act: (pieceId: string) => Effect.Effect<ToolAnswer, Failure, Requirements>,
): Effect.Effect<ToolAnswer, Failure, Requirements> =>
	context.pieceId === undefined ? Effect.succeed(refused("you are not on a piece")) : act(context.pieceId);

export const onVoyage = <Failure, Requirements>(
	context: ToolContext,
	act: (voyageId: string) => Effect.Effect<ToolAnswer, Failure, Requirements>,
): Effect.Effect<ToolAnswer, Failure, Requirements> =>
	context.voyageId === undefined ? Effect.succeed(refused("you are not on a voyage")) : act(context.voyageId);
