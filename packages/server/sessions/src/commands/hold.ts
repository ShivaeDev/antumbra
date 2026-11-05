import { hold as command } from "@antumbra/domain-sessions/commands/hold.ts";
import { hold as commandDecision } from "@antumbra/server-sessions/logic/commands/hold.ts";
import { ExecutionHistory } from "@antumbra/server-storage/execution/service.ts";
import { Clock, Effect } from "effect";
import { isSqlError } from "effect/sql/SqlError";
export const hold = Effect.fn("Sessions.hold")(function* (input: typeof command.Input.Type) {
	const history = yield* ExecutionHistory;
	return yield* history
		.write(
			Effect.gen(function* () {
				yield* history.checkRequest(input.requestId);
				const value = yield* commandDecision(input);
				const sequence = yield* history.nextSequence();
				const at = yield* Clock.currentTimeMillis;
				yield* history
					.append(input.requestId, [{ ...value, _tag: command.emits.name, at, sequence }])
					.pipe(Effect.catchIf((error) => error._tag !== "AlreadyDone", Effect.die));
				return sequence;
			}),
		)
		.pipe(Effect.catchIf(isSqlError, Effect.die));
});
