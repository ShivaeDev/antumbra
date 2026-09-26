import { describe, expect, it } from "vitest";
import type { Line } from "#pr/lines.ts";
import type { Reading } from "#pr/observation.ts";
import type { Outcome } from "#pr/pages.ts";
import { emptyLimit, initial, step, type Watch } from "#pr/program.ts";
import fixture from "#test/fixtures/pr-rest.json" with { type: "json" };

const head = fixture.pull.head.sha;
const pushed = "9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f";

const body = (value: unknown): Outcome => ({ kind: "pages", pages: [JSON.stringify(value)] });
const same: Outcome = { kind: "same" };
const quiet: Reading = { checks: undefined, comments: same, inline: same, pull: same, reviews: same, statuses: undefined };

const pullOf = (edits: object = {}): Outcome => body({ ...fixture.pull, merged: false, mergeable_state: "clean", state: "open", ...edits });
const checksOf = (runs: readonly unknown[], at: string = head) => ({ head: at, outcome: body({ check_runs: runs, total_count: runs.length }) });
const statusOf = (state: string, at: string = head) => ({
	head: at,
	outcome: body({ state, statuses: [{ context: "deploy", state }], total_count: 1 }),
});

const runs = fixture.checks.check_runs;
const green = runs.filter((run) => run.conclusion === "success");
const running = runs.map((run) => ({ ...run, conclusion: null, status: "queued" }));

const opened: Reading = { ...quiet, comments: body([]), inline: body([]), pull: pullOf(), reviews: body([]) };

const walk = (until: "ci" | "end", readings: readonly Reading[], start: Watch = initial) => {
	let watch = start;
	const lines: Line[] = [];
	let exit: number | undefined;
	readings.forEach((reading, index) => {
		const progress = step(watch, until, index * 30_000, reading);
		lines.push(...progress.lines);
		watch = progress.watch;
		exit = progress.exit;
	});
	return { exit, lines, watch };
};

describe("watching to the end", () => {
	it("says nothing about a quiet pull request", () => {
		expect(walk("end", [opened, quiet, quiet]).lines).toEqual([]);
	});

	it("changes nothing when every endpoint answers 304", () => {
		const first = walk("end", [{ ...opened, checks: checksOf(runs) }]);
		const later = step(first.watch, "end", 60_000, quiet);
		expect(later.lines).toEqual([]);
		expect(later.exit).toBeUndefined();
		expect(later.watch.pieces).toEqual(first.watch.pieces);
	});

	it("holds a failure back until every check on the head has settled", () => {
		const pending = walk("end", [{ ...opened, checks: checksOf(running) }]);
		expect(pending.lines).toEqual([]);
		expect(step(pending.watch, "end", 30_000, { ...quiet, checks: checksOf(runs) }).lines).toEqual([
			{ state: "ci-failed", head, checks: ["govulncheck"], statuses: [] },
		]);
	});

	it("prints a failure once per head, and judges a new head on its own", () => {
		const red = { ...opened, checks: checksOf(runs) };
		const once = walk("end", [red, red, red]);
		expect(once.lines).toHaveLength(1);
		const later = step(once.watch, "end", 90_000, {
			...quiet,
			checks: checksOf(runs, pushed),
			pull: pullOf({ head: { ...fixture.pull.head, sha: pushed } }),
		});
		expect(later.lines).toEqual([{ state: "ci-failed", head: pushed, checks: ["govulncheck"], statuses: [] }]);
	});

	it("prints green checks once per head, and again after a failure turns green", () => {
		const passed = { ...quiet, checks: checksOf(green) };
		const once = walk("end", [{ ...opened, checks: checksOf(running) }, passed, passed]);
		expect(once.lines).toEqual([{ state: "ci-green", head }]);
		const failed = step(once.watch, "end", 90_000, { ...quiet, checks: checksOf(runs) });
		expect(step(failed.watch, "end", 120_000, passed).lines).toEqual([{ state: "ci-green", head }]);
	});

	it("never prints the failure of a superseded head", () => {
		const armed = walk("end", [{ ...opened, checks: checksOf(running) }]);
		const moved = step(armed.watch, "end", 30_000, {
			...quiet,
			checks: checksOf(runs),
			pull: pullOf({ head: { ...fixture.pull.head, sha: pushed } }),
		});
		expect(moved.lines).toEqual([]);
	});

	it("waits for commit statuses and names the ones that failed apart from the checks", () => {
		const deploying = walk("end", [{ ...opened, checks: checksOf(green), statuses: statusOf("pending") }]);
		expect(deploying.lines).toEqual([]);
		expect(step(deploying.watch, "end", 30_000, { ...quiet, statuses: statusOf("failure") }).lines).toEqual([
			{ state: "ci-failed", head, checks: [], statuses: ["deploy"] },
		]);
		expect(step(deploying.watch, "end", 30_000, { ...quiet, statuses: statusOf("success") }).lines).toEqual([{ state: "ci-green", head }]);
	});

	it("prints a conflict once and keeps it when mergeability goes unknown", () => {
		const seen = walk("end", [
			{ ...opened, pull: pullOf({ mergeable_state: "dirty" }) },
			{ ...quiet, pull: pullOf({ mergeable_state: "unknown" }) },
		]);
		expect(seen.lines).toEqual([{ state: "conflict", head }]);
	});

	it("prints each change of mergeability that matters", () => {
		const mergeable = (state: string): Reading => ({ ...quiet, pull: pullOf({ mergeable_state: state }) });
		const seen = walk("end", [opened, mergeable("dirty"), mergeable("blocked"), mergeable("behind"), mergeable("unstable"), mergeable("dirty")]);
		expect(seen.lines).toEqual([
			{ state: "conflict", head },
			{ state: "mergeable", head },
			{ state: "behind", head },
			{ state: "mergeable", head },
			{ state: "conflict", head },
		]);
	});

	it("ends on a merge and on a close", () => {
		const merged = walk("end", [{ ...opened, pull: pullOf({ merged: true, state: "closed" }) }]);
		expect(merged.lines).toEqual([{ state: "merged", head }]);
		expect(merged.exit).toBe(0);
		const closed = walk("end", [{ ...opened, pull: pullOf({ state: "closed" }) }]);
		expect(closed.lines).toEqual([{ state: "closed", head }]);
		expect(closed.exit).toBe(0);
	});
});

describe("watching until the checks settle", () => {
	it("leaves a line saying the checks passed or failed", () => {
		expect(walk("ci", [{ ...opened, checks: checksOf(green) }])).toMatchObject({ exit: 0, lines: [{ state: "ci-green", head }] });
		expect(walk("ci", [{ ...opened, checks: checksOf(runs) }])).toMatchObject({
			exit: 1,
			lines: [{ state: "ci-failed", head, checks: ["govulncheck"], statuses: [] }],
		});
	});

	it("says the verdict even when it was reported before", () => {
		const reported = walk("ci", [{ ...opened, checks: checksOf(runs) }]).watch;
		expect(step(reported, "ci", 30_000, quiet)).toMatchObject({ exit: 1, lines: [{ state: "ci-failed", head }] });
	});

	it("gives up when a push supersedes the head it armed on", () => {
		const armed = walk("ci", [{ ...opened, checks: checksOf(running) }]);
		const moved = step(armed.watch, "ci", 30_000, { ...quiet, pull: pullOf({ head: { ...fixture.pull.head, sha: pushed } }) });
		expect(moved.lines).toEqual([{ state: "superseded", head: pushed }]);
		expect(moved.exit).toBe(4);
	});

	it("stops when the pull request ends under it", () => {
		const armed = walk("ci", [{ ...opened, checks: checksOf(running) }]);
		const gone = step(armed.watch, "ci", 30_000, { ...quiet, pull: pullOf({ merged: true, state: "closed" }) });
		expect(gone.lines).toEqual([{ state: "merged", head }]);
		expect(gone.exit).toBe(3);
	});

	it("gives a head that never grows a check five minutes", () => {
		const armed = walk("ci", [opened]);
		expect(step(armed.watch, "ci", emptyLimit - 1, quiet).exit).toBeUndefined();
		const expired = step(armed.watch, "ci", emptyLimit, quiet);
		expect(expired.lines).toEqual([{ state: "no-checks", head }]);
		expect(expired.exit).toBe(0);
	});
});

describe("comments", () => {
	const talking: Reading = {
		...opened,
		comments: body(fixture["issue-comments"]),
		inline: body(fixture["review-comments"]),
		reviews: body(fixture.reviews),
	};
	const drafted = fixture.reviews.map((review) => (review.state === "CHANGES_REQUESTED" ? { ...review, state: "PENDING" } : review));
	const watching = walk("end", [opened]).watch;

	it("prints each comment once, however often it polls", () => {
		const first = walk("end", [talking], watching);
		expect(first.lines.map((line) => line.state)).toEqual([
			"review",
			"review",
			"review",
			"review",
			"review-comment",
			"review-comment",
			"review-comment",
			"comment",
			"comment",
			"changes-requested",
		]);
		expect(step(first.watch, "end", 30_000, talking).lines).toEqual([]);
		expect(step(first.watch, "end", 60_000, quiet).lines).toEqual([]);
	});

	it("takes the comments it finds at first sight as read, but reports the state they leave", () => {
		const first = walk("end", [talking]);
		expect(first.lines).toEqual([{ state: "changes-requested", head }]);
		const answered = [...fixture["issue-comments"], { ...fixture["issue-comments"][0], id: 99 }];
		expect(step(first.watch, "end", 30_000, { ...quiet, comments: body(answered) }).lines).toMatchObject([{ state: "comment", id: 99 }]);
	});

	it("keeps taking comments as read until the first poll has read all of them", () => {
		const first = walk("end", [{ ...talking, comments: { kind: "failed", message: "gh: HTTP 502" } }]);
		expect(step(first.watch, "end", 30_000, talking).lines).toEqual([]);
	});

	it("says nothing about a review that is still a draft, or about the comments it holds", () => {
		const seen = walk("end", [{ ...talking, reviews: body(drafted) }], watching);
		expect(seen.lines.map((line) => line.state)).toEqual(["review", "review", "review", "review-comment", "review-comment", "comment", "comment"]);
	});
});

describe("failed gh calls", () => {
	const failed: Reading = { ...quiet, pull: { kind: "failed", message: "gh: HTTP 502" } };
	const started = walk("end", [opened]);

	it("says nothing about a single failed poll", () => {
		const once = step(started.watch, "end", 30_000, failed);
		expect(once.lines).toEqual([]);
		expect(once.exit).toBeUndefined();
	});

	it("complains once when the polls have failed for ten minutes", () => {
		const first = step(started.watch, "end", 30_000, failed);
		const waiting = step(first.watch, "end", 300_000, failed);
		const due = step(waiting.watch, "end", 630_000, failed);
		expect(waiting.lines).toEqual([]);
		expect(due.lines).toEqual([{ state: "gh-error", message: "gh: HTTP 502", minutes: 10 }]);
		expect(due.exit).toBeUndefined();
		expect(step(due.watch, "end", 660_000, failed).lines).toEqual([]);
	});

	it("complains again after a poll succeeds and the failures return", () => {
		const first = step(started.watch, "end", 30_000, failed);
		const due = step(first.watch, "end", 630_000, failed);
		const recovered = step(due.watch, "end", 660_000, quiet);
		expect(recovered.lines).toEqual([]);
		const again = step(recovered.watch, "end", 690_000, failed);
		expect(again.lines).toEqual([]);
		expect(step(again.watch, "end", 1_290_000, failed).lines).toEqual([{ state: "gh-error", message: "gh: HTTP 502", minutes: 10 }]);
	});

	it("counts an answer it cannot decode as a failed poll", () => {
		const broken: Reading = { ...quiet, pull: { kind: "pages", pages: ["{"] } };
		const first = step(started.watch, "end", 30_000, broken);
		expect(first.lines).toEqual([]);
		const due = step(first.watch, "end", 630_000, broken);
		expect(due.lines).toHaveLength(1);
		expect(due.lines[0]).toMatchObject({ state: "gh-error", minutes: 10 });
	});
});
