import { forgetLoop as command } from "@antumbra/domain-supervision/commands/loop-forgotten.ts";
import { ExecutionHistory } from "@antumbra/server-storage/execution/service.ts";
import { forgetLoop as commandDecision } from "@antumbra/server-supervision/logic/commands/loop-forgotten.ts";
import { Clock, Effect } from "effect";
import { isSqlError } from "effect/sql/SqlError";
export const forgetLoop = Effect.fn("Supervision.forgetLoop")(function* (input: typeof command.Input.Type) {
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
