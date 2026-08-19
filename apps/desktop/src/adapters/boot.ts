import { Effect, type ManagedRuntime } from "effect";
import { app } from "electron";

export const ownerBoot = <A, E, R, E2, R2>(
	ownership: Effect.Effect<boolean, E, R>,
	start: () => Effect.Effect<A, E2, R2>,
): Effect.Effect<A | undefined, E | E2, R | R2> =>
	ownership.pipe(
		Effect.flatMap((owner) =>
			owner ? Effect.suspend(start) : Effect.succeed(undefined),
		),
	);

export const runManagedRuntimeStartup = <R, ER, A, E>(
	runtime: ManagedRuntime.ManagedRuntime<R, ER>,
	startup: Effect.Effect<A, E, R>,
): Promise<A> =>
	runtime.runPromise(startup).catch(async (cause: unknown) => {
		try {
			await runtime.dispose();
		} catch (disposalCause) {
			throw new AggregateError(
				[cause, disposalCause],
				`runtime startup failed: ${String(cause)}; runtime disposal also failed: ${String(disposalCause)}`,
				{ cause },
			);
		}
		throw cause;
	});

// why: a forked boot fiber dies invisibly — a failure here must reach
// stderr and end the process, or the app sits windowless with no trace.
export const runBoot = (start: () => Promise<unknown>): void => {
	start().catch((cause: unknown) => {
		process.stderr.write(`antumbra bridge failed to boot: ${String(cause)}\n`);
		app.exit(1);
	});
};
