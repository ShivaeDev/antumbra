import { Clock, Effect } from "effect";
import type { Exec, Report, Step } from "#ready/model.ts";

const runStep = (
	step: Step,
	exec: Exec,
	report: Report,
): Effect.Effect<boolean> =>
	Effect.gen(function* () {
		const started = yield* Clock.currentTimeMillis;
		const result = yield* exec(step);
		const finished = yield* Clock.currentTimeMillis;
		if (result.exitCode === 0) {
			yield* report.passed(step, finished - started);
			return true;
		}
		yield* report.failed(step, result);
		return false;
	});

export const runReady = (
	all: readonly Step[],
	exec: Exec,
	report: Report,
): Effect.Effect<boolean> =>
	Effect.gen(function* () {
		let passed = 0;
		for (const step of all) {
			const ok = yield* runStep(step, exec, report);
			if (!ok) {
				yield* report.summary(passed, all.length);
				return false;
			}
			passed += 1;
		}
		yield* report.summary(passed, all.length);
		return true;
	});
