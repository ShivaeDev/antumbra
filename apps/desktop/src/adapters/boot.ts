import { app } from "electron";

// why: a forked boot fiber dies invisibly — a failure here must reach
// stderr and end the process, or the app sits windowless with no trace.
export const runBoot = (start: () => Promise<unknown>): void => {
	start().catch((cause: unknown) => {
		process.stderr.write(`antumbra bridge failed to boot: ${String(cause)}\n`);
		app.exit(1);
	});
};
