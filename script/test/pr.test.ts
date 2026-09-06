import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Result } from "effect";
import { describe, expect, it } from "vitest";
import { checksPath, issueCommentsPath, parseCommand, pullPath, reviewCommentsPath, reviewsPath, usage } from "#pr/command.ts";
import type { Outcome, Reading } from "#pr/observation.ts";
import { emptyLimit, initial, type Line, render, step, type Watch } from "#pr/program.ts";
import fixture from "#test/fixtures/pr-rest.json" with { type: "json" };

const entry = join(dirname(dirname(fileURLToPath(import.meta.url))), "pr.ts");
const runPr = (...args: readonly string[]) => spawnSync("node", [entry, ...args], { encoding: "utf8" });

const head = fixture.pull.head.sha;
const pushed = "9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f";

const body = (value: unknown): Outcome => ({ kind: "body", body: JSON.stringify(value) });
const same: Outcome = { kind: "same" };
const quiet: Reading = { checks: undefined, comments: same, inline: same, pull: same, reviews: same };

const pullOf = (edits: object = {}): Outcome => body({ ...fixture.pull, merged: false, mergeable_state: "clean", state: "open", ...edits });
const checksOf = (runs: readonly unknown[], at: string = head) => ({ head: at, outcome: body({ check_runs: runs, total_count: runs.length }) });

const runs = fixture.checks.check_runs;
const green = runs.filter((run) => run.conclusion === "success");
const running = runs.map((run) => ({ ...run, conclusion: null, status: "queued" }));

const opened: Reading = { ...quiet, comments: body([]), inline: body([]), pull: pullOf(), reviews: body([]) };

const walk = (until: "ci" | "end", readings: readonly Reading[], clock: readonly number[] = []) => {
	let watch: Watch = initial;
	const lines: Line[] = [];
	let exit: number | undefined;
	readings.forEach((reading, index) => {
		const progress = step(watch, until, clock[index] ?? index * 30_000, reading);
		lines.push(...progress.lines);
		watch = progress.watch;
		exit = progress.exit;
	});
	return { exit, lines, watch };
};

describe("pr watch arguments", () => {
	it("takes a number or a link, and an explicit until", () => {
		expect(parseCommand(["watch", "912"])).toEqual(Result.succeed({ target: { number: 912, repo: "{owner}/{repo}" }, until: "end" }));
		expect(parseCommand(["watch", "https://github.com/o/r/pull/7", "--until", "ci"])).toEqual(
			Result.succeed({ target: { number: 7, repo: "o/r" }, until: "ci" }),
		);
	});

	it("rejects anything but watch with one pull request", () => {
		expect(parseCommand([])).toEqual(Result.fail(usage));
		expect(parseCommand(["watch"])).toEqual(Result.fail(usage));
		expect(parseCommand(["settle", "912"])).toEqual(Result.fail(usage));
		expect(parseCommand(["watch", "912", "--until", "later"])).toEqual(Result.fail(usage));
		expect(Result.isFailure(parseCommand(["watch", "https://example.com/pull/1"]))).toBe(true);
	});

	it("asks GitHub for one page of each endpoint", () => {
		const target = { number: 912, repo: "o/r" };
		expect(pullPath(target)).toBe("repos/o/r/pulls/912");
		expect(checksPath(target, "abc")).toBe("repos/o/r/commits/abc/check-runs?per_page=100");
		expect(reviewsPath(target)).toBe("repos/o/r/pulls/912/reviews?per_page=100");
		expect(reviewCommentsPath(target)).toBe("repos/o/r/pulls/912/comments?per_page=100");
		expect(issueCommentsPath(target)).toBe("repos/o/r/issues/912/comments?per_page=100");
	});
});

describe("watching to the end", () => {
	it("says nothing about a quiet pull request", () => {
		expect(walk("end", [opened, { ...opened, checks: checksOf(green) }, quiet]).lines).toEqual([]);
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
			{ state: "ci-failed", head, checks: ["govulncheck"] },
		]);
	});

	it("prints a failure once per head, and judges a new head on its own", () => {
		const red = { ...opened, checks: checksOf(runs) };
		const once = walk("end", [red, red, red]);
		expect(once.lines).toHaveLength(1);
		const later = step(once.watch, "end", 90_000, {
			checks: checksOf(runs, pushed),
			comments: same,
			inline: same,
			pull: pullOf({ head: { ...fixture.pull.head, sha: pushed } }),
			reviews: same,
		});
		expect(later.lines).toEqual([{ state: "ci-failed", head: pushed, checks: ["govulncheck"] }]);
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

	it("prints a conflict once and keeps it when mergeability goes unknown", () => {
		const seen = walk("end", [
			{ ...opened, pull: pullOf({ mergeable_state: "dirty" }) },
			{ ...quiet, pull: pullOf({ mergeable_state: "unknown" }) },
		]);
		expect(seen.lines).toEqual([{ state: "conflict", head }]);
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
			lines: [{ state: "ci-failed", head, checks: ["govulncheck"] }],
		});
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

	it("prints each comment once, however often it polls", () => {
		const first = walk("end", [talking]);
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

	it("says nothing about a review that is still a draft, or about the comments it holds", () => {
		const seen = walk("end", [{ ...talking, reviews: body(drafted) }]);
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
		const broken: Reading = { ...quiet, pull: { kind: "body", body: "{" } };
		const first = step(started.watch, "end", 30_000, broken);
		expect(first.lines).toEqual([]);
		const due = step(first.watch, "end", 630_000, broken);
		expect(due.lines).toHaveLength(1);
		expect(due.lines[0]).toMatchObject({ state: "gh-error", minutes: 10 });
	});

	it("cannot start when the first poll does not reach the pull request", () => {
		const first = walk("end", [failed]);
		expect(first.lines).toEqual([{ state: "gh-error", message: "gh: HTTP 502", minutes: 0 }]);
		expect(first.exit).toBe(2);
	});
});

describe("printed lines", () => {
	it("puts the state name first so a reader can filter on it", () => {
		expect(render({ state: "ci-failed", head: "abc", checks: ["lint"] })).toBe('{"state":"ci-failed","head":"abc","checks":["lint"]}');
		expect(render({ state: "merged", head: "abc" })).toBe('{"state":"merged","head":"abc"}');
	});
});

describe("pr entry point", () => {
	it("exits 2 with usage when called without a pull request", () => {
		const result = runPr();
		expect(result.status).toBe(2);
		expect(result.stderr).toContain(usage);
	});

	it("exits 2 when the argument is not a pull request", () => {
		const result = runPr("watch", "https://example.com/nope");
		expect(result.status).toBe(2);
		expect(result.stderr).toContain("not a pull request");
	});
});
