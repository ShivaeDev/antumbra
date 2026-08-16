import { Database, type WriteExecutors } from "@antumbra/persistence";
import { Effect, Option } from "effect";

export const makeIsSpawnCancelling = Effect.gen(function* () {
	const db = yield* Database;
	const executors = yield* Effect.context<WriteExecutors>();
	return (intentId: string) =>
		db.Intent.where({ id: intentId })
			.first()
			.pipe(
				Effect.provideContext(executors),
				Effect.map((row) =>
					Option.match(row, {
						onNone: () => false,
						onSome: (intent) => intent.status === "cancelling",
					}),
				),
				Effect.catchCause((cause) =>
					Effect.logWarning(
						"spawn cancellation state could not be read",
						{ intentId },
						cause,
					).pipe(Effect.as(false)),
				),
			);
});
