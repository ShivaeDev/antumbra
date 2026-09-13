import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { body, comment, decodeRecording, flakes, title } from "#flakes/report.ts";

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

const recording = decodeRecording(readFileSync(join(repoRoot, "script/test/fixtures/flake-runs.json"), "utf8"));

const run = "https://github.com/owner/repo/actions/runs/42";

describe("flaky tests", () => {
	it("reports the test that failed and passed within its runs, and no other", () => {
		expect(flakes(recording).map((test) => test.name)).toEqual(["adopts a change the host refused"]);
	});

	it("names the test in the issue title and its file, runs and failures in the body", () => {
		const found = flakes(recording)[0];
		expect(found).toBeDefined();
		if (found === undefined) return;
		expect(title(found)).toBe("Flaky test: adopts a change the host refused");
		const written = body(found, run);
		expect(written).toContain("`packages/glass/changes/test/screens.test.tsx` in `glass/changes`.");
		expect(written).toContain("Ran 2 times in 6.2 seconds: 1 failed, 1 passed.");
		expect(written).toContain("Timed out after 5 seconds waiting for the adoption request to carry the corrected URL");
		expect(written).toContain(`Workflow run: ${run}`);
	});

	it("repeats the runs and the workflow run in a comment without the file heading", () => {
		const found = flakes(recording)[0];
		expect(found).toBeDefined();
		if (found === undefined) return;
		const written = comment(found, run);
		expect(written).toContain("Ran 2 times in 6.2 seconds: 1 failed, 1 passed.");
		expect(written).toContain(`Workflow run: ${run}`);
		expect(written).not.toContain("in `glass/changes`.");
	});
});
