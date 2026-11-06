import { storyKit } from "@shivaedev/test-story/server/storyKit.ts";
import { Effect, Layer } from "effect";
import type { Report, Step, StepResult } from "#ready/model.ts";
import { runReady } from "#ready/program.ts";

const stepNamed = (name: string): Step => ({ args: [], command: name, name });

interface Recorded {
	readonly executed: string[];
	readonly lines: string[];
}

const recordingReport = (lines: string[]): Report => ({
	failed: (step, result) =>
		Effect.sync(() => {
			lines.push(`failed ${step.name} exit ${result.exitCode}`);
		}),
	passed: (step) =>
		Effect.sync(() => {
			lines.push(`passed ${step.name}`);
		}),
	summary: (passed, total) =>
		Effect.sync(() => {
			lines.push(`summary ${passed}/${total}`);
		}),
});

const run = (names: readonly string[], failing: string | undefined) => {
	const executed: string[] = [];
	const lines: string[] = [];
	const exec = (step: Step): Effect.Effect<StepResult> =>
		Effect.sync(() => {
			executed.push(step.name);
			return { exitCode: step.name === failing ? 2 : 0, output: "captured" };
		});
	return Effect.map(runReady(names.map(stepNamed), exec, recordingReport(lines)), (ok): { readonly ok: boolean } & Recorded => ({
		executed,
		lines,
		ok,
	}));
};

export const readyKit = storyKit({
	name: "Ready runner",
	clock: "test",
	layer: Layer.empty,
	stages: [],
	create: () => Effect.succeed({ run }),
	verbs: (engine) => engine,
});
