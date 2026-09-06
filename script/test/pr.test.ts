import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Result } from "effect";
import { describe, expect, it } from "vitest";
import { type Observation, observationFrom } from "#pr/observation.ts";
import { advance, initial, type Line, parseCommand, render, step, type Until, usage } from "#pr/program.ts";
import views from "#test/fixtures/pr-views.json" with { type: "json" };

const entry = join(dirname(dirname(fileURLToPath(import.meta.url))), "pr.ts");
const runPr = (...args: readonly string[]) => spawnSync("node", [entry, ...args], { encoding: "utf8" });

const head = "71f98f2c6865e2cc44a96ef0256256f03e383d65";
const pushedHead = "5fd27789cb4c574007a1b17243403ffc15471530";

const recorded = (name: keyof typeof views): string => JSON.stringify(views[name]);
const seen = (name: keyof typeof views): Observation => Result.getOrThrow(observationFrom(recorded(name)));

const walk = (until: Until, observations: readonly Observation[]): readonly Line[] => {
	let watch = initial;
	const lines: Line[] = [];
	for (const observation of observations) {
		const progress = advance(watch, until, observation);
		lines.push(...progress.lines);
		watch = progress.watch;
	}
	return lines;
};

describe("pr watch arguments", () => {
	it("defaults to watching until the pull request ends", () => {
		expect(parseCommand(["watch", "912"])).toEqual(Result.succeed({ spec: "912", until: "end" }));
	});

	it("takes an explicit until", () => {
		expect(parseCommand(["watch", "https://github.com/o/r/pull/1", "--until", "ci"])).toEqual(
			Result.succeed({ spec: "https://github.com/o/r/pull/1", until: "ci" }),
		);
	});

	it("states how it is called", () => {
		expect(usage).toBe("usage: pnpm pr watch <pull request url or number> [--until end|ci]");
	});

	it("rejects anything but watch with one pull request", () => {
		expect(parseCommand([])).toEqual(Result.fail(usage));
		expect(parseCommand(["watch"])).toEqual(Result.fail(usage));
		expect(parseCommand(["settle", "912"])).toEqual(Result.fail(usage));
		expect(parseCommand(["watch", "--until", "ci"])).toEqual(Result.fail(usage));
		expect(parseCommand(["watch", "912", "--until", "later"])).toEqual(Result.fail(usage));
		expect(parseCommand(["watch", "912", "913"])).toEqual(Result.fail(usage));
	});
});

describe("reading a recorded gh pr view", () => {
	it("rates a pull request whose checks all passed", () => {
		expect(seen("open-green")).toEqual({ changesRequested: false, ci: "green", conflict: false, failed: [], head, lifecycle: "open" });
	});

	it("names the checks that failed", () => {
		expect(seen("open-failed").ci).toBe("failed");
		expect(seen("open-failed").failed).toEqual(["package"]);
	});

	it("rates a build that is still running as pending", () => {
		expect(seen("open-running").ci).toBe("pending");
		expect(seen("open-running").failed).toEqual([]);
	});

	it("reads a failure alongside a running check as pending", () => {
		expect(seen("open-pending").ci).toBe("pending");
		expect(seen("open-pending").failed).toEqual(["validate"]);
	});

	it("reads a failing legacy commit status", () => {
		expect(seen("legacy-status-failure").ci).toBe("failed");
		expect(seen("legacy-status-failure").failed).toEqual(["CLA Signing"]);
	});

	it("rates a head with no checks as none", () => {
		expect(seen("open-unchecked").ci).toBe("none");
	});

	it("reads conflicts and requested changes", () => {
		expect(seen("open-conflict").conflict).toBe(true);
		expect(seen("open-conflict").changesRequested).toBe(true);
	});

	it("leaves mergeability unknown rather than guessing", () => {
		expect(seen("merged").conflict).toBeUndefined();
		expect(seen("merged").lifecycle).toBe("merged");
		expect(seen("closed").lifecycle).toBe("closed");
	});

	it("reports output it cannot read", () => {
		expect(Result.isFailure(observationFrom("not json"))).toBe(true);
		expect(Result.isFailure(observationFrom('{"state":"OPEN"}'))).toBe(true);
	});
});

describe("watching to the end", () => {
	it("says nothing while a pull request is green and open", () => {
		expect(walk("end", [seen("open-green"), seen("open-green")])).toEqual([]);
	});

	it("says nothing while checks are still running", () => {
		expect(walk("end", [seen("open-pending")])).toEqual([]);
	});

	it("holds a failure back until every check on the head has settled", () => {
		expect(walk("end", [seen("open-pending"), seen("open-failed")])).toEqual([{ state: "ci-failed", head, checks: ["package"] }]);
	});

	it("prints a failure once per head", () => {
		expect(walk("end", [seen("open-failed"), seen("open-failed"), seen("open-failed")])).toHaveLength(1);
	});

	it("never prints the failure of a superseded head", () => {
		const running = seen("open-pending");
		const settled = { ...seen("open-failed"), head: pushedHead };
		expect(walk("end", [running, { ...running, head: pushedHead }, settled])).toEqual([
			{ state: "ci-failed", head: pushedHead, checks: ["package"] },
		]);
	});

	it("judges a new head on its own", () => {
		expect(walk("end", [seen("open-failed"), { ...seen("open-failed"), head: pushedHead }])).toHaveLength(2);
	});

	it("prints a conflict and requested changes once", () => {
		expect(walk("end", [seen("open-conflict"), seen("open-conflict")])).toEqual([
			{ state: "conflict", head },
			{ state: "changes-requested", head },
		]);
	});

	it("keeps a known conflict when mergeability goes unknown", () => {
		expect(walk("end", [seen("open-conflict"), { ...seen("open-conflict"), conflict: undefined }])).toHaveLength(2);
	});

	it("ends on a merge", () => {
		const progress = advance(initial, "end", seen("merged"));
		expect(progress.lines).toEqual([{ state: "merged", head }]);
		expect(progress.exit).toBe(0);
	});

	it("ends on a close", () => {
		const progress = advance(initial, "end", seen("closed"));
		expect(progress.lines).toEqual([{ state: "closed", head }]);
		expect(progress.exit).toBe(0);
	});

	it("keeps watching while checks fail", () => {
		expect(advance(initial, "end", seen("open-failed")).exit).toBeUndefined();
	});
});

describe("watching until the checks settle", () => {
	it("waits while checks are still running", () => {
		const progress = advance(initial, "ci", seen("open-pending"));
		expect(progress.lines).toEqual([]);
		expect(progress.exit).toBeUndefined();
	});

	it("leaves a line saying the checks passed", () => {
		const progress = advance(initial, "ci", seen("open-green"));
		expect(progress.lines).toEqual([{ state: "ci-green", head }]);
		expect(progress.exit).toBe(0);
	});

	it("leaves a line naming the failed checks", () => {
		const progress = advance(initial, "ci", seen("open-failed"));
		expect(progress.lines).toEqual([{ state: "ci-failed", head, checks: ["package"] }]);
		expect(progress.exit).toBe(1);
	});

	it("gives up when a push supersedes the head it armed on", () => {
		const armed = advance(initial, "ci", seen("open-pending"));
		const pushed = advance(armed.watch, "ci", { ...seen("open-pending"), head: pushedHead });
		expect(pushed.lines).toEqual([{ state: "superseded", head: pushedHead }]);
		expect(pushed.exit).toBe(4);
	});
});

describe("failed gh calls", () => {
	it("reports a failure once until the call succeeds again", () => {
		const first = step(initial, "end", Result.fail("gh: could not reach github.com"));
		const second = step(first.watch, "end", Result.fail("gh: could not reach github.com"));
		expect(first.lines).toEqual([{ state: "gh-error", message: "gh: could not reach github.com" }]);
		expect(second.lines).toEqual([]);
		expect(second.exit).toBeUndefined();
	});

	it("reports the same failure again after a good round", () => {
		const first = step(initial, "end", Result.fail("gh: bad gateway"));
		const good = step(first.watch, "end", Result.succeed(recorded("open-green")));
		const again = step(good.watch, "end", Result.fail("gh: bad gateway"));
		expect(again.lines).toEqual([{ state: "gh-error", message: "gh: bad gateway" }]);
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

	it("exits 2 with usage for an unknown until", () => {
		const result = runPr("watch", "912", "--until", "later");
		expect(result.status).toBe(2);
		expect(result.stderr).toContain("usage");
	});
});
