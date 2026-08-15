import process from "node:process";
import { Effect } from "effect";
import type { Report } from "#ready/model.ts";

const seconds = (millis: number): string => `${(millis / 1000).toFixed(1)}s`;

export const consoleReport: Report = {
	failed: (step, result) =>
		Effect.sync(() => {
			process.stderr.write(
				`✗ ${step.name} — exit ${result.exitCode}\n\n${result.output}\n`,
			);
			process.exitCode = 1;
		}),
	passed: (step, millis) =>
		Effect.sync(() => {
			process.stdout.write(`✓ ${step.name} (${seconds(millis)})\n`);
		}),
	summary: (passed, total) =>
		Effect.sync(() => {
			process.stdout.write(
				passed === total
					? `ready: all ${total} steps passed\n`
					: `ready: failed after ${passed}/${total} steps\n`,
			);
		}),
};
