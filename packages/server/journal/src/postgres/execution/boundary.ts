import { Effect } from "effect";
import { isSqlError } from "effect/sql/SqlError";
import { ExecutionHistory } from "#postgres/execution/service.ts";

export const withExecutionWrite = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
	Effect.gen(function* () {
		const history = yield* ExecutionHistory;
		return yield* history.write(effect.pipe(Effect.tap(() => history.refresh())));
	}).pipe(Effect.catchIf(isSqlError, Effect.die));
