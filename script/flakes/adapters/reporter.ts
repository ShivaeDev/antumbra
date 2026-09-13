import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import type { Reporter, TestCase } from "vitest/node";

const repoRoot = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));

export const directory = join(repoRoot, ".flakes");

type Run = { readonly message?: string; readonly outcome: "failed" | "passed" };

type Recorded = {
	readonly durationMillis: number;
	readonly file: string;
	readonly name: string;
	readonly project: string;
	readonly runs: readonly Run[];
};

const runsOf = (retries: number, passed: boolean, messages: readonly string[]): readonly Run[] => {
	const runs: Run[] = [];
	for (let index = 0; index < (passed ? retries : retries + 1); index += 1) {
		runs.push({ message: messages[index] ?? "The run recorded no failure message.", outcome: "failed" });
	}
	if (passed) runs.push({ outcome: "passed" });
	return runs;
};

const free = (base: string): string => {
	let attempt = 0;
	let path = join(directory, `${base}.json`);
	while (existsSync(path)) {
		attempt += 1;
		path = join(directory, `${base}-${attempt}.json`);
	}
	return path;
};

export default class FlakeReporter implements Reporter {
	readonly #recorded: Recorded[] = [];

	onTestCaseResult(test: TestCase): void {
		const result = test.result();
		const diagnostic = test.diagnostic();
		if (diagnostic === undefined || diagnostic.retryCount === 0) return;
		if (result.state !== "failed" && result.state !== "passed") return;
		this.#recorded.push({
			durationMillis: diagnostic.duration,
			file: relative(repoRoot, test.module.moduleId),
			name: test.fullName,
			project: test.project.name,
			runs: runsOf(
				diagnostic.retryCount,
				result.state === "passed",
				(result.errors ?? []).map((error) => error.message ?? ""),
			),
		});
	}

	onTestRunEnd(): void {
		if (this.#recorded.length === 0) return;
		mkdirSync(directory, { recursive: true });
		writeFileSync(free(String(process.pid)), JSON.stringify(this.#recorded, undefined, "\t"));
	}
}
