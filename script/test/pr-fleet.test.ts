import { createHash } from "node:crypto";
import { it } from "@effect/vitest";
import { Effect, Result } from "effect";
import { describe, expect } from "vitest";
import type { Target } from "#pr/command.ts";
import { type Fleet, fleetFrom, memoryOf } from "#pr/fleet.ts";
import { decodeMemory, encodeMemory, forgotten } from "#pr/memory.ts";
import type { Get } from "#pr/pages.ts";
import { round } from "#pr/round.ts";

type Routes = Map<string, unknown>;

const example: Target = { number: 1, repo: "octo/example" };
const other: Target = { number: 2, repo: "octo/example" };
const elsewhere: Target = { number: 7, repo: "octo/other" };

const shaOf = (target: Target) => `${target.number}`.repeat(40);
const run = (name: string, conclusion: string) => ({ conclusion, name, status: "completed" });
const comment = (id: number) => ({ body: `note ${id}`, html_url: `https://github.com/octo/example/pull/1#${id}`, id, user: { login: "octocat" } });

const served = (target: Target, pull: object = {}, runs: readonly unknown[] = [run("test", "success")]): Routes => {
	const base = `repos/${target.repo}`;
	const sha = shaOf(target);
	return new Map<string, unknown>([
		[`${base}/pulls/${target.number}`, { head: { sha }, mergeable_state: "clean", merged: false, state: "open", ...pull }],
		[`${base}/commits/${sha}/check-runs?per_page=100`, { check_runs: runs, total_count: runs.length }],
		[`${base}/commits/${sha}/status?per_page=100`, { state: "pending", statuses: [], total_count: 0 }],
		[`${base}/pulls/${target.number}/reviews?per_page=100`, []],
		[`${base}/pulls/${target.number}/comments?per_page=100`, []],
		[`${base}/issues/${target.number}/comments?per_page=100`, []],
	]);
};

const merged = (...routes: readonly Routes[]): Routes => new Map(routes.flatMap((route) => [...route]));

const pageOf = (value: unknown, page: number): unknown => {
	const slice = (items: readonly unknown[]) => items.slice((page - 1) * 100, page * 100);
	if (Array.isArray(value)) return slice(value);
	if (typeof value !== "object" || value === null || !("check_runs" in value) || !Array.isArray(value.check_runs)) return value;
	return { check_runs: slice(value.check_runs), total_count: value.check_runs.length };
};

const github = (routes: Routes) => {
	const asked: { readonly etag: string | undefined; readonly path: string }[] = [];
	const get: Get = (path, etag) =>
		Effect.suspend(() => {
			asked.push({ etag, path });
			const [, base = path, page = "1"] = /^(.*?)(?:&page=(\d+))?$/.exec(path) ?? [];
			const value = routes.get(base);
			if (value === undefined) return Effect.fail(new Error("HTTP/2.0 404 Not Found"));
			const body = JSON.stringify(pageOf(value, Number(page)));
			const tag = `W/"${createHash("sha1").update(body).digest("hex")}"`;
			return Effect.succeed(etag === tag ? { body: undefined, etag: undefined } : { body, etag: tag });
		});
	return { asked, get };
};

const turn = (routes: Routes, fleet: Fleet, now = 0) => {
	const gh = github(routes);
	return Effect.map(round(gh.get, fleet, now), (next) => ({ ...next, asked: gh.asked }));
};

const watching = (targets: readonly Target[], repos: readonly string[] = []) => fleetFrom(targets, repos, "end", forgotten);

const restarted = (fleet: Fleet, targets: readonly Target[], repos: readonly string[] = []) =>
	fleetFrom(targets, repos, "end", Result.getOrThrow(decodeMemory(encodeMemory(memoryOf(fleet)))));

describe("watching several pull requests", () => {
	it.effect("names the pull request on every line", () =>
		Effect.gen(function* () {
			const routes = merged(served(example), served(elsewhere, {}, [run("test", "failure")]));
			const first = yield* turn(routes, watching([example, elsewhere]));
			expect(first.events).toEqual([
				{ state: "ci-green", repo: "octo/example", number: 1, head: shaOf(example) },
				{ state: "ci-failed", repo: "octo/other", number: 7, head: shaOf(elsewhere), checks: ["test"], statuses: [] },
			]);
		}),
	);

	it.effect("asks again with the ETag it was given, and says nothing when GitHub answers 304", () =>
		Effect.gen(function* () {
			const routes = merged(served(example), served(elsewhere));
			const first = yield* turn(routes, watching([example, elsewhere]));
			const second = yield* turn(routes, first.fleet, 30_000);
			expect(second.events).toEqual([]);
			expect(second.asked.every((request) => request.etag?.startsWith('W/"'))).toBe(true);
		}),
	);

	it.effect("exits once every pull request it was given has ended", () =>
		Effect.gen(function* () {
			const first = yield* turn(merged(served(example, { merged: true, state: "closed" }), served(elsewhere)), watching([example, elsewhere]));
			expect(first.events).toContainEqual({ state: "merged", repo: "octo/example", number: 1, head: shaOf(example) });
			expect(first.exit).toBeUndefined();
			const second = yield* turn(merged(served(elsewhere, { state: "closed" })), first.fleet, 30_000);
			expect(second.events).toEqual([{ state: "closed", repo: "octo/other", number: 7, head: shaOf(elsewhere) }]);
			expect(second.exit).toBe(0);
			expect(second.asked.some((request) => request.path.startsWith("repos/octo/example/"))).toBe(false);
		}),
	);

	it.effect("cannot start when the first poll does not reach a pull request", () =>
		Effect.gen(function* () {
			const first = yield* turn(new Map(), watching([example]));
			expect(first.events).toEqual([{ state: "gh-error", repo: "octo/example", number: 1, message: "HTTP/2.0 404 Not Found", minutes: 0 }]);
			expect(first.exit).toBe(2);
		}),
	);

	it.effect("stops everything when one of the pull requests it was given cannot be reached at the start", () =>
		Effect.gen(function* () {
			const first = yield* turn(served(example), watching([example, elsewhere]));
			expect(first.events).toContainEqual({ state: "gh-error", repo: "octo/other", number: 7, message: "HTTP/2.0 404 Not Found", minutes: 0 });
			expect(first.exit).toBe(2);
		}),
	);

	it.effect("reads an answer it could not decode again instead of trusting its ETag", () =>
		Effect.gen(function* () {
			const routes = served(example);
			const first = yield* turn(routes, watching([example]));
			routes.set("repos/octo/example/pulls/1", { state: "open" });
			const broken = yield* turn(routes, first.fleet, 30_000);
			expect(broken.events).toEqual([]);
			const later = yield* turn(routes, broken.fleet, 630_000);
			expect(later.events).toMatchObject([{ state: "gh-error", repo: "octo/example", number: 1, minutes: 10 }]);
		}),
	);
});

describe("watching a whole repository", () => {
	const list = "repos/octo/example/pulls?state=open&per_page=100";

	it.effect("takes the pull requests open at the start as read, and reports everything on one that opens later", () =>
		Effect.gen(function* () {
			const talking = served(example);
			talking.set("repos/octo/example/issues/1/comments?per_page=100", [comment(10)]);
			const first = yield* turn(merged(talking, new Map([[list, [{ number: 1 }]]])), watching([], ["octo/example"]));
			expect(first.events).toEqual([{ state: "ci-green", repo: "octo/example", number: 1, head: shaOf(example) }]);
			const fresh = served(other);
			fresh.set("repos/octo/example/issues/2/comments?per_page=100", [comment(20)]);
			const second = yield* turn(merged(talking, fresh, new Map([[list, [{ number: 2 }, { number: 1 }]]])), first.fleet, 30_000);
			expect(second.events.map((event) => [event.state, event.number])).toEqual([
				["comment", 2],
				["ci-green", 2],
			]);
		}),
	);

	it.effect("lets go of a pull request once it has ended", () =>
		Effect.gen(function* () {
			const open = new Map([[list, [{ number: 1 }]]]);
			const first = yield* turn(merged(served(example), open), watching([], ["octo/example"]));
			const second = yield* turn(merged(served(example, { state: "closed" }), new Map([[list, []]])), first.fleet, 30_000);
			expect(second.events).toEqual([{ state: "closed", repo: "octo/example", number: 1, head: shaOf(example) }]);
			const third = yield* turn(new Map([[list, []]]), second.fleet, 60_000);
			expect(third.asked.map((request) => request.path)).toEqual([list]);
			expect(third.exit).toBeUndefined();
		}),
	);

	it.effect("cannot start when the first list does not arrive", () =>
		Effect.gen(function* () {
			const first = yield* turn(new Map(), watching([], ["octo/example"]));
			expect(first.events).toEqual([{ state: "gh-error", repo: "octo/example", message: "HTTP/2.0 404 Not Found", minutes: 0 }]);
			expect(first.exit).toBe(2);
		}),
	);
});

describe("reading more than a hundred items", () => {
	const comments = "repos/octo/example/issues/1/comments?per_page=100";

	it.effect("reads every page, and notices an item that starts a new page", () =>
		Effect.gen(function* () {
			const routes = merged(served(example), new Map([[comments, Array.from({ length: 100 }, (_, index) => comment(index + 1))]]));
			const first = yield* turn(routes, watching([example]));
			expect(first.asked.map((request) => request.path)).toContain(`${comments}&page=2`);
			routes.set(
				comments,
				Array.from({ length: 101 }, (_, index) => comment(index + 1)),
			);
			const second = yield* turn(routes, first.fleet, 30_000);
			expect(second.events).toMatchObject([{ state: "comment", number: 1, id: 101 }]);
		}),
	);

	it.effect("judges the checks by every run, not the first hundred", () =>
		Effect.gen(function* () {
			const runs = [...Array.from({ length: 100 }, (_, index) => run(`job ${index}`, "success")), run("late", "failure")];
			const first = yield* turn(served(example, {}, runs), watching([example]));
			expect(first.events).toMatchObject([{ state: "ci-failed", checks: ["late"] }]);
		}),
	);
});

describe("restarting", () => {
	it.effect("does not replay what it already reported, and asks with the ETags it kept", () =>
		Effect.gen(function* () {
			const routes = served(example, { mergeable_state: "dirty" });
			routes.set("repos/octo/example/issues/1/comments?per_page=100", [comment(10)]);
			const first = yield* turn(routes, watching([example]));
			expect(first.events.map((event) => event.state)).toEqual(["ci-green", "conflict"]);
			const again = yield* turn(routes, restarted(first.fleet, [example]), 30_000);
			expect(again.events).toEqual([]);
			expect(again.asked.every((request) => request.etag !== undefined)).toBe(true);
			routes.set("repos/octo/example/issues/1/comments?per_page=100", [comment(10), comment(11)]);
			routes.set("repos/octo/example/pulls/1", { head: { sha: shaOf(example) }, mergeable_state: "clean", merged: false, state: "open" });
			const later = yield* turn(routes, restarted(again.fleet, [example]), 60_000);
			expect(later.events.map((event) => event.state)).toEqual(["comment", "mergeable"]);
		}),
	);

	it.effect("ends quietly on a pull request whose end it already reported", () =>
		Effect.gen(function* () {
			const routes = served(example, { merged: true, state: "closed" });
			const first = yield* turn(routes, watching([example]));
			expect(first.events.map((event) => event.state)).toEqual(["ci-green", "merged"]);
			const again = yield* turn(routes, restarted(first.fleet, [example]), 30_000);
			expect(again.events).toEqual([]);
			expect(again.exit).toBe(0);
		}),
	);

	it.effect("asks without ETags for a pull request it holds nothing about", () =>
		Effect.gen(function* () {
			const routes = served(example);
			const first = yield* turn(routes, watching([example]));
			const stale = fleetFrom([example], [], "end", { etags: Object.fromEntries(first.fleet.etags), pulls: {} });
			const again = yield* turn(routes, stale, 30_000);
			expect(again.asked.every((request) => request.etag === undefined)).toBe(true);
			expect(again.events).toEqual([{ state: "ci-green", repo: "octo/example", number: 1, head: shaOf(example) }]);
		}),
	);

	it.effect("keeps following the pull requests of a repository when its list has not changed", () =>
		Effect.gen(function* () {
			const list = "repos/octo/example/pulls?state=open&per_page=100";
			const routes = merged(served(example), new Map([[list, [{ number: 1 }]]]));
			const first = yield* turn(routes, watching([], ["octo/example"]));
			routes.set("repos/octo/example/issues/1/comments?per_page=100", [comment(11)]);
			const again = yield* turn(routes, restarted(first.fleet, [], ["octo/example"]), 30_000);
			expect(again.events).toMatchObject([{ state: "comment", repo: "octo/example", number: 1, id: 11 }]);
		}),
	);
});
