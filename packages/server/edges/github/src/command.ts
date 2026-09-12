import { Effect } from "effect";
import { GhUnavailable } from "#errors.ts";
import { type GhCommand, GhProcess } from "#process.ts";
import { acceptProcessOutput, decodeProcessOutput } from "#result.ts";
export const runGh = Effect.fn("GitHub.runGh")(function* (command: GhCommand) {
	const process = yield* GhProcess;
	const raw = yield* process.run(command).pipe(
		Effect.timeoutOrElse({
			duration: command.timeoutMillis,
			orElse: () =>
				Effect.fail(
					new GhUnavailable({ detail: `gh ${command.operation} exceeded its deadline of ${command.timeoutMillis}ms`, operation: command.operation }),
				),
		}),
	);
	return yield* decodeProcessOutput(command.operation, raw).pipe(Effect.flatMap((output) => acceptProcessOutput(command.operation, output)));
});
