import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import type { UnknownGitHubWord } from "#dialect.ts";
import { mapPullRequest } from "#mapping.ts";
import {
	decodeObserveResponse,
	type ObservedNode,
	type PullRequestNode,
} from "#payload.ts";
import { buildObservePlan } from "#query.ts";

// why: recorded from the real endpoint (ShivaeDev/antumbra, pull requests 23,
// 24, 27, 32 and a number nobody can resolve) so the translation is checked
// against GitHub's own words rather than against words we invented for it.
const RECORDED = readFileSync(
	fileURLToPath(new URL("./fixtures/observe-response.json", import.meta.url)),
	"utf8",
);

const PLAN = buildObservePlan(
	[23, 24, 27, 32, 9999].map((number) => ({
		name: "antumbra",
		number,
		owner: "ShivaeDev",
		repoId: "repo-antumbra",
	})),
);

const observed = Effect.runSync(
	decodeObserveResponse("observe-changes", RECORDED, PLAN.selections),
);

const withNode = (fields: Partial<PullRequestNode>): ObservedNode => {
	const base = observed[0];
	return base === undefined
		? expect.unreachable("the fixture is empty")
		: { node: { ...base.node, ...fields }, raw: base.raw, repoId: base.repoId };
};

const mapped = (fields: Partial<PullRequestNode>) =>
	Effect.runSync(mapPullRequest(withNode(fields)));

describe("reading GitHub's answer as the neutral vocabulary", () => {
	it("drops the alias for a pull request nobody can see", () => {
		expect(observed).toHaveLength(4);
		expect(observed.map((one) => one.node.number)).toEqual([23, 24, 27, 32]);
	});

	it("maps a merged pull request onto a landed change", () => {
		const merged = observed[0];
		if (merged === undefined) {
			return expect.unreachable("the fixture lost its first node");
		}
		expect(Effect.runSync(mapPullRequest(merged))).toEqual({
			activityAt: Date.parse("2026-08-15T20:24:25Z"),
			baseRef: "main",
			checks: "green",
			externalId: "23",
			headRef: "voyages",
			headSha: "5db93d623f85b559613a71cf767889ae71eca980",
			isDraft: false,
			// why: a merged pull request reports UNKNOWN merge state, which is not
			// a conflict — it is GitHub declining to answer a settled question.
			mergeable: "unknown",
			raw: merged.raw,
			repoId: "repo-antumbra",
			review: "none",
			stage: "landed",
			title:
				"Voyages hold pieces gated by edges; launched pieces are dispatched to crew",
			url: "https://github.com/ShivaeDev/antumbra/pull/23",
		});
	});

	it("maps an open pull request onto an open change", () => {
		const open = observed[3];
		if (open === undefined) {
			return expect.unreachable("the fixture lost its open node");
		}
		const change = Effect.runSync(mapPullRequest(open));
		expect(change.stage).toBe("open");
		expect(change.mergeable).toBe("clean");
		expect(change.externalId).toBe("32");
		expect(change.headRef).toBe("shivae/agent-session-recovery");
	});

	it.each([
		["OPEN", "open"],
		["CLOSED", "withdrawn"],
		["MERGED", "landed"],
	] as const)("reads state %s as stage %s", (state, stage) => {
		expect(mapped({ state }).stage).toBe(stage);
	});

	it.effect("preserves and refuses unsupported GitHub vocabulary", () => {
		type DialectWord = string | UnknownGitHubWord | null;
		const futureWords = [
			{
				field: "state",
				from: '"state": "MERGED"',
				read: (node: PullRequestNode): DialectWord => node.state,
				to: '"state": "SOMETHING_NEW"',
				word: "SOMETHING_NEW",
			},
			{
				field: "mergeStateStatus",
				from: '"mergeStateStatus": "UNKNOWN"',
				read: (node: PullRequestNode): DialectWord => node.mergeStateStatus,
				to: '"mergeStateStatus": "FUTURE_MERGE"',
				word: "FUTURE_MERGE",
			},
			{
				field: "reviewDecision",
				from: '"reviewDecision": null',
				read: (node: PullRequestNode): DialectWord => node.reviewDecision,
				to: '"reviewDecision": "FUTURE_REVIEW"',
				word: "FUTURE_REVIEW",
			},
			{
				field: "statusCheckRollup.state",
				from: '"state": "SUCCESS"',
				read: (node: PullRequestNode): DialectWord =>
					node.commits.nodes[0]?.commit.statusCheckRollup?.state ?? null,
				to: '"state": "FUTURE_CHECK"',
				word: "FUTURE_CHECK",
			},
		] satisfies ReadonlyArray<{
			readonly field: string;
			readonly from: string;
			readonly read: (node: PullRequestNode) => DialectWord;
			readonly to: string;
			readonly word: string;
		}>;
		return Effect.gen(function* () {
			for (const futureWord of futureWords) {
				const future = RECORDED.replace(futureWord.from, futureWord.to);
				expect(future).not.toBe(RECORDED);
				const [unsupported] = yield* decodeObserveResponse(
					"observe-changes",
					future,
					PLAN.selections,
				);
				if (unsupported === undefined) {
					return expect.unreachable("the fixture lost its first node");
				}
				expect(futureWord.read(unsupported.node)).toEqual({
					_tag: "Unknown",
					raw: futureWord.word,
				});
				const failure = yield* Effect.flip(mapPullRequest(unsupported));
				expect(failure).toMatchObject({
					_tag: "GhOutputInvalid",
					raw: unsupported.raw,
				});
				expect(failure.detail).toContain(
					`${futureWord.field} answered unsupported word ${JSON.stringify(futureWord.word)}`,
				);
			}
		});
	});

	it.each([
		["CLEAN", "clean"],
		["DIRTY", "conflict"],
		["BLOCKED", "unknown"],
		["BEHIND", "unknown"],
		["UNSTABLE", "unknown"],
		["HAS_HOOKS", "unknown"],
		["DRAFT", "unknown"],
		["UNKNOWN", "unknown"],
	] as const)("reads merge state %s as %s", (mergeStateStatus, mergeable) => {
		expect(mapped({ mergeStateStatus }).mergeable).toBe(mergeable);
	});

	it.each([
		["APPROVED", "approved"],
		["CHANGES_REQUESTED", "changes_requested"],
		["REVIEW_REQUIRED", "pending"],
		[null, "none"],
	] as const)("reads review decision %s as %s", (reviewDecision, review) => {
		expect(mapped({ reviewDecision }).review).toBe(review);
	});

	it.each([
		["SUCCESS", "green"],
		["FAILURE", "red"],
		["ERROR", "red"],
		["PENDING", "pending"],
		["EXPECTED", "pending"],
	] as const)("reads a check rollup of %s as %s", (state, checks) => {
		const commits = { nodes: [{ commit: { statusCheckRollup: { state } } }] };
		expect(mapped({ commits }).checks).toBe(checks);
	});

	it("reads a missing check rollup as no signal at all", () => {
		expect(
			mapped({
				commits: { nodes: [{ commit: { statusCheckRollup: null } }] },
			}).checks,
		).toBe("none");
		expect(mapped({ commits: { nodes: [] } }).checks).toBe("none");
	});

	it("puts an undatable change outside every recency window", () => {
		expect(mapped({ updatedAt: "never" }).activityAt).toBe(0);
	});
});
