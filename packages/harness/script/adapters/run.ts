import { Cause, Effect, Exit } from "effect";

export const runMain = <Value, Error>(
	program: Effect.Effect<Value, Error>,
): void => {
	Effect.runPromiseExit(program).then((exit) => {
		if (Exit.isFailure(exit)) {
			process.stderr.write(`${Cause.pretty(exit.cause)}\n`);
			process.exitCode = 1;
		}
	});
};
