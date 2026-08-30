import { Effect } from "effect";
import { describe, expect, it } from "vitest";
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

const run = (names: readonly string[], failing: string | undefined): { readonly ok: boolean } & Recorded => {
	const executed: string[] = [];
	const lines: string[] = [];
	const exec = (step: Step): Effect.Effect<StepResult> =>
		Effect.sync(() => {
			executed.push(step.name);
			return { exitCode: step.name === failing ? 2 : 0, output: "captured" };
		});
	const ok = Effect.runSync(runReady(names.map(stepNamed), exec, recordingReport(lines)));
	return { executed, lines, ok };
};

describe("ready runner", () => {
	it("runs every step in order and summarizes a full pass", () => {
		const { executed, lines, ok } = run(["one", "two", "three"], undefined);
		expect(ok).toBe(true);
		expect(executed).toEqual(["one", "two", "three"]);
		expect(lines).toEqual(["passed one", "passed two", "passed three", "summary 3/3"]);
	});

	it("stops at the first failure and reports how far it got", () => {
		const { executed, lines, ok } = run(["one", "two", "three"], "two");
		expect(ok).toBe(false);
		expect(executed).toEqual(["one", "two"]);
		expect(lines).toEqual(["passed one", "failed two exit 2", "summary 1/3"]);
	});
});
