import { Schema } from "effect";

export const label = "flaky test";

const Run = Schema.Struct({
	message: Schema.optional(Schema.String),
	outcome: Schema.Literals(["failed", "passed"]),
});

const Recorded = Schema.Struct({
	durationMillis: Schema.Number,
	file: Schema.String,
	name: Schema.String,
	project: Schema.String,
	runs: Schema.Array(Run),
});
export type Recorded = typeof Recorded.Type;

const Recording = Schema.Array(Recorded);

export const decodeRecording = Schema.decodeUnknownSync(Schema.fromJsonString(Recording));

export const flakes = (recording: readonly Recorded[]): readonly Recorded[] => {
	const found: Recorded[] = [];
	for (const test of recording) {
		const failed = test.runs.some((run) => run.outcome === "failed");
		const passed = test.runs.some((run) => run.outcome === "passed");
		if (failed && passed) found.push(test);
	}
	return found.toSorted((left, right) => left.name.localeCompare(right.name));
};

const counted = (test: Recorded, outcome: "failed" | "passed"): number => test.runs.filter((run) => run.outcome === outcome).length;

const spent = (millis: number): string => (millis < 1000 ? `${Math.round(millis)} ms` : `${(millis / 1000).toFixed(1)} seconds`);

const timing = (test: Recorded): string =>
	`Ran ${test.runs.length} times in ${spent(test.durationMillis)}: ${counted(test, "failed")} failed, ${counted(test, "passed")} passed.`;

const fenced = (message: string): string => ["```", message, "```"].join("\n");

const failures = (test: Recorded): readonly string[] =>
	test.runs.flatMap((run) => (run.outcome === "failed" ? [fenced(run.message ?? "The run recorded no failure message.")] : []));

export const title = (test: Recorded): string => `Flaky test: ${test.name}`;

const heading = (test: Recorded): string => (test.project === "" ? `\`${test.file}\`.` : `\`${test.file}\` in \`${test.project}\`.`);

export const body = (test: Recorded, run: string): string =>
	[heading(test), "", timing(test), "", ...failures(test), "", `Workflow run: ${run}`].join("\n");

export const comment = (test: Recorded, run: string): string => [timing(test), "", ...failures(test), "", `Workflow run: ${run}`].join("\n");
