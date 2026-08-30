import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { mapPullRequest } from "#mapping.ts";
import { decodeObserveResponse, type ObservedNode, type PullRequestNode } from "#payload.ts";
import { buildObservePlan } from "#query.ts";

// Recorded from GitHub for pull requests 23, 24, 27, 32, and an unresolved number.
const RECORDED = readFileSync(fileURLToPath(new URL("./fixtures/observe-response.json", import.meta.url)), "utf8");

const PLAN = buildObservePlan(
	[23, 24, 27, 32, 9999].map((number) => ({
		name: "antumbra",
		number,
		owner: "ShivaeDev",
		repoId: "repo-antumbra",
	})),
);

const observed = Effect.runSync(decodeObserveResponse("observe-changes", RECORDED, PLAN.selections));

const withNode = (fields: Partial<PullRequestNode>): ObservedNode => {
	const base = observed[0];
	return base === undefined ? expect.unreachable("the fixture is empty") : { node: { ...base.node, ...fields }, raw: base.raw, repoId: base.repoId };
};

const mapped = (fields: Partial<PullRequestNode>) => Effect.runSync(mapPullRequest(withNode(fields)));

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
			mergeable: "unknown",
			raw: merged.raw,
			repoId: "repo-antumbra",
			review: "none",
			stage: "landed",
			title: "Voyages hold pieces gated by edges; launched pieces are dispatched to crew",
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

	it.effect("preserves an unknown GitHub word as provider evidence", () =>
		Effect.gen(function* () {
			const future = RECORDED.replace('"mergeStateStatus": "UNKNOWN"', '"mergeStateStatus": "FUTURE_MERGE"');
			const [unsupported] = yield* decodeObserveResponse("observe-changes", future, PLAN.selections);
			if (unsupported === undefined) {
				return expect.unreachable("the fixture lost its first node");
			}
			expect(unsupported.node.mergeStateStatus).toEqual({ _tag: "Unknown", raw: "FUTURE_MERGE" });
			const failure = yield* Effect.flip(mapPullRequest(unsupported));
			expect(failure).toMatchObject({
				_tag: "GhOutputInvalid",
				raw: unsupported.raw,
			});
		}),
	);

	it("maps an ordinary blocked review to the visible change state", () => {
		const change = mapped({
			commits: { nodes: [{ commit: { statusCheckRollup: { state: "FAILURE" } } }] },
			mergeStateStatus: "DIRTY",
			reviewDecision: "CHANGES_REQUESTED",
		});
		expect(change.checks).toBe("red");
		expect(change.mergeable).toBe("conflict");
		expect(change.review).toBe("changes_requested");
	});

	it("reads a missing check rollup as no signal at all", () => {
		expect(
			mapped({
				commits: { nodes: [{ commit: { statusCheckRollup: null } }] },
			}).checks,
		).toBe("none");
	});
});
