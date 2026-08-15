import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ChangeHostRepo } from "@antumbra/plugin-api";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { makeGitHubHost } from "#host.ts";
import {
	AUTHENTICATED,
	LOGGED_OUT,
	type ScriptedGh,
	scriptedGh,
} from "#test/scripted-gh.ts";

const RECORDED = readFileSync(
	fileURLToPath(new URL("./fixtures/observe-response.json", import.meta.url)),
	"utf8",
);

const REPO: ChangeHostRepo = {
	defaultRef: "main",
	id: "repo-antumbra",
	name: "antumbra",
	source: "https://github.com/ShivaeDev/antumbra.git",
};

const withGh = <A, E, R>(
	body: (gh: ScriptedGh) => Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R> => Effect.scoped(Effect.flatMap(scriptedGh, body));

const hostOf = (gh: ScriptedGh) =>
	makeGitHubHost({ executable: gh.executable });

describe("what the GitHub host can do right now", () => {
	it.live("reports the login it inherits from gh", () =>
		withGh((gh) =>
			Effect.gen(function* () {
				gh.answer("auth", AUTHENTICATED);
				const host = yield* hostOf(gh);
				expect(yield* host.capability).toEqual({
					available: true,
					detail: "Logged in to github.com account skipper (keyring)",
				});
				// why: a watcher asks on every pass; the second answer must not cost
				// a second process.
				yield* host.capability;
				expect(gh.received().filter((arg) => arg === "status")).toHaveLength(1);
			}),
		),
	);

	it.live("hands on gh's own remedy when there is no login", () =>
		withGh((gh) =>
			Effect.gen(function* () {
				gh.answer("auth", LOGGED_OUT);
				const host = yield* hostOf(gh);
				const capability = yield* host.capability;
				expect(capability.available).toBe(false);
				expect(capability.detail).toContain("gh auth login");
			}),
		),
	);

	it.live("says so plainly when gh is not installed", () =>
		Effect.gen(function* () {
			const host = yield* makeGitHubHost({ executable: "/nowhere/gh" });
			expect(yield* host.capability).toEqual({
				available: false,
				detail: "gh CLI not found",
			});
		}),
	);

	it.live("claims the repos it can address and no others", () =>
		withGh((gh) =>
			Effect.gen(function* () {
				const host = yield* hostOf(gh);
				expect(host.tag).toBe("github");
				expect(host.supports(REPO)).toBe(true);
				expect(host.supports({ ...REPO, source: "/somewhere/reef" })).toBe(
					false,
				);
			}),
		),
	);
});

describe("observing changes through gh", () => {
	it.live("maps every answered pull request and drops the missing one", () =>
		withGh((gh) =>
			Effect.gen(function* () {
				gh.answer("graphql", {
					code: 1,
					err: "gh: Could not resolve",
					out: RECORDED,
				});
				const host = yield* hostOf(gh);
				const seen = yield* host.observe([
					{ externalId: "23", repo: REPO },
					{ externalId: "9999", repo: REPO },
					{ externalId: "77", repo: { ...REPO, source: "/somewhere/reef" } },
				]);

				expect(seen.map((one) => one.externalId)).toEqual([
					"23",
					"24",
					"27",
					"32",
				]);
				const asked = gh.received().find((arg) => arg.startsWith("query="));
				expect(asked).toContain("pullRequest(number: 23)");
				expect(asked).toContain("pullRequest(number: 9999)");
				// why: the ref on a repo this host does not claim never reaches gh.
				expect(asked).not.toContain("somewhere/reef");
			}),
		),
	);

	it.live("fails the whole pass when the login stopped working", () =>
		withGh((gh) =>
			Effect.gen(function* () {
				gh.answer("auth", AUTHENTICATED);
				gh.answer("graphql", LOGGED_OUT);
				const host = yield* hostOf(gh);
				expect((yield* host.capability).available).toBe(true);

				const failure = yield* Effect.flip(
					host.observe([{ externalId: "23", repo: REPO }]),
				);
				expect(failure._tag).toBe("ChangeHostUnavailable");
				expect(failure.message).toContain("gh auth login");

				// why: the yes cached a moment ago is thrown away by the failure that
				// disproved it, so the next tool call asks again and reports the
				// truth instead of repeating it for another minute.
				gh.answer("auth", LOGGED_OUT);
				expect((yield* host.capability).available).toBe(false);
			}),
		),
	);
});

describe("adopting a change by its address", () => {
	it.live("refuses a pull request belonging to another repository", () =>
		withGh((gh) =>
			Effect.gen(function* () {
				const host = yield* hostOf(gh);
				const failure = yield* Effect.flip(
					host.adopt("https://github.com/someone/elsewhere/pull/5", REPO),
				);
				expect(failure._tag).toBe("ChangeHostRefused");
				expect(failure.message).toContain("someone/elsewhere");
				expect(gh.received()).toEqual([]);
			}),
		),
	);

	it.live("observes the pull request an address points at", () =>
		withGh((gh) =>
			Effect.gen(function* () {
				gh.answer("graphql", { out: RECORDED });
				const host = yield* hostOf(gh);
				const adopted = yield* host.adopt(
					"https://github.com/ShivaeDev/antumbra/pull/23",
					REPO,
				);
				expect(adopted.externalId).toBe("23");
				expect(adopted.stage).toBe("landed");
			}),
		),
	);
});
