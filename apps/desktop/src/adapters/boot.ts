import { Effect } from "effect";
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

// why: a forked boot fiber dies invisibly — a failure here must reach
// stderr and end the process, or the app sits windowless with no trace.
export const runBoot = (start: () => Promise<unknown>): void => {
	start().catch((cause: unknown) => {
		process.stderr.write(`antumbra bridge failed to boot: ${String(cause)}\n`);
		app.exit(1);
	});
};
