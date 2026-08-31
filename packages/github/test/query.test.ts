import { describe, expect, it } from "@effect/vitest";
import { buildObservePlan, chunked, OBSERVE_CHUNK_SIZE } from "#query.ts";

const ref = (owner: string, name: string, number: number) => ({
	name,
	number,
	owner,
	repoId: `repo-${owner}-${name}`,
});

describe("asking about many changes at once", () => {
	it("groups one repository's pull requests into a single selection", () => {
		const { query } = buildObservePlan([ref("ShivaeDev", "antumbra", 23), ref("ShivaeDev", "antumbra", 24)]);
		expect(query).toContain('r_0: repository(owner: "ShivaeDev", name: "antumbra")');
		expect(query).toContain("pr_0: pullRequest(number: 23)");
		expect(query).toContain("pr_1: pullRequest(number: 24)");
		expect(query.match(/repository\(/g)).toHaveLength(1);
		expect(query).toContain("statusCheckRollup { state }");
	});

	it("keeps aliases unique when two repositories share a call", () => {
		const { query } = buildObservePlan([ref("ShivaeDev", "antumbra", 7), ref("someone", "elsewhere", 7), ref("ShivaeDev", "antumbra", 8)]);
		expect(query.match(/repository\(/g)).toHaveLength(2);
		expect(query).toContain("pr_0: pullRequest(number: 7)");
		expect(query).toContain("pr_1: pullRequest(number: 8)");
		expect(query).toContain("pr_2: pullRequest(number: 7)");
	});

	it("splits a fleet into calls of at most fifty", () => {
		const refs = Array.from({ length: 120 }, (_, index) => ref("ShivaeDev", "antumbra", index + 1));
		const chunks = chunked(refs, OBSERVE_CHUNK_SIZE);
		expect(chunks.map((chunk) => chunk.length)).toEqual([50, 50, 20]);
		expect(chunked([], OBSERVE_CHUNK_SIZE)).toEqual([]);
	});
});
