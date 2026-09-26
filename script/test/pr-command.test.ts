import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Result } from "effect";
import { describe, expect, it } from "vitest";
import { statePath } from "#pr/adapters/state.ts";
import { parseCommand, resolved, usage } from "#pr/command.ts";
import { labelled, render } from "#pr/lines.ts";
import { checks, issueComments, openPulls, pull, reviewComments, reviews, statuses } from "#pr/resources.ts";

const entry = join(dirname(dirname(fileURLToPath(import.meta.url))), "pr.ts");
const runPr = (...args: readonly string[]) => spawnSync("node", [entry, ...args], { encoding: "utf8" });

describe("pr watch arguments", () => {
	it("takes a number, a link, or owner/repo#number, and an explicit until", () => {
		expect(parseCommand(["watch", "912"])).toEqual(
			Result.succeed({ sources: [{ kind: "pull", number: 912, repo: undefined }], state: undefined, until: "end" }),
		);
		expect(parseCommand(["watch", "https://github.com/o/r/pull/7", "--until", "ci"])).toEqual(
			Result.succeed({ sources: [{ kind: "pull", number: 7, repo: "o/r" }], state: undefined, until: "ci" }),
		);
		expect(parseCommand(["watch", "octo/example#12"])).toMatchObject(
			Result.succeed({ sources: [{ kind: "pull", number: 12, repo: "octo/example" }] }),
		);
	});

	it("takes several pull requests, whole repositories and a state file", () => {
		expect(parseCommand(["watch", "octo/example", "octo/other#3", "--state", "watch.json"])).toEqual(
			Result.succeed({
				sources: [
					{ kind: "repo", repo: "octo/example" },
					{ kind: "pull", number: 3, repo: "octo/other" },
				],
				state: "watch.json",
				until: "end",
			}),
		);
	});

	it("rejects anything but watch with pull requests or repositories", () => {
		expect(parseCommand([])).toEqual(Result.fail(usage));
		expect(parseCommand(["watch"])).toEqual(Result.fail(usage));
		expect(parseCommand(["settle", "912"])).toEqual(Result.fail(usage));
		expect(parseCommand(["watch", "912", "--until", "later"])).toEqual(Result.fail(usage));
		expect(parseCommand(["watch", "912", "--state"])).toEqual(Result.fail(usage));
		expect(Result.isFailure(parseCommand(["watch", "https://example.com/pull/1"]))).toBe(true);
	});

	it("waits for the checks of exactly one pull request", () => {
		expect(parseCommand(["watch", "1", "2", "--until", "ci"])).toEqual(Result.fail(usage));
		expect(parseCommand(["watch", "octo/example", "--until", "ci"])).toEqual(Result.fail(usage));
	});

	it("resolves bare numbers against the repository of the current directory", () => {
		const command = Result.getOrThrow(parseCommand(["watch", "12", "#12", "octo/other#12", "octo/other"]));
		expect(resolved(command.sources, "octo/example")).toEqual({
			repos: ["octo/other"],
			targets: [
				{ number: 12, repo: "octo/example" },
				{ number: 12, repo: "octo/other" },
			],
		});
	});

	it("keeps the state of each watch in its own file under the home directory", () => {
		const target = { number: 12, repo: "octo/example" };
		expect(statePath([target], [], "end", "/home/me")).toBe("/home/me/.antumbra/pr-watch/octo_example_12.json");
		expect(statePath([target], [], "ci", "/home/me")).toBe("/home/me/.antumbra/pr-watch/octo_example_12.ci.json");
		expect(statePath([target], ["octo/other"], "end", "/home/me")).toBe("/home/me/.antumbra/pr-watch/octo_example_12+octo_other.json");
		const many = Array.from({ length: 20 }, (_, index) => ({ number: index, repo: "octo/a-rather-long-repository-name" }));
		expect(statePath(many, [], "end", "/home/me")).toMatch(/^\/home\/me\/\.antumbra\/pr-watch\/[0-9a-f]{64}\.json$/);
	});

	it("asks GitHub for pages of a hundred", () => {
		const target = { number: 912, repo: "o/r" };
		expect(pull(target).path).toBe("repos/o/r/pulls/912");
		expect(checks(target, "abc").path).toBe("repos/o/r/commits/abc/check-runs?per_page=100");
		expect(statuses(target, "abc").path).toBe("repos/o/r/commits/abc/status?per_page=100");
		expect(reviews(target).path).toBe("repos/o/r/pulls/912/reviews?per_page=100");
		expect(reviewComments(target).path).toBe("repos/o/r/pulls/912/comments?per_page=100");
		expect(issueComments(target).path).toBe("repos/o/r/issues/912/comments?per_page=100");
		expect(openPulls("o/r").path).toBe("repos/o/r/pulls?state=open&per_page=100");
	});
});

describe("printed lines", () => {
	it("puts the state name first, then the pull request it concerns", () => {
		const target = { number: 7, repo: "o/r" };
		expect(render(labelled(target, { state: "ci-failed", head: "abc", checks: ["lint"], statuses: [] }))).toBe(
			'{"state":"ci-failed","repo":"o/r","number":7,"head":"abc","checks":["lint"],"statuses":[]}',
		);
		expect(render(labelled(target, { state: "merged", head: "abc" }))).toBe('{"state":"merged","repo":"o/r","number":7,"head":"abc"}');
		expect(render(labelled({ repo: "o/r" }, { state: "gh-error", message: "HTTP 502", minutes: 10 }))).toBe(
			'{"state":"gh-error","repo":"o/r","message":"HTTP 502","minutes":10}',
		);
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
