import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { OpenChangeRequest } from "@antumbra/plugin-api";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { makeGitHubHost } from "#host.ts";
import { advanceBerth, type Berthed, BRANCH, berthed, refSha, remoteBranches } from "#test/berth.ts";
import { type ScriptedGh, scriptedGh } from "#test/scripted-gh.ts";

const RECORDED = readFileSync(fileURLToPath(new URL("./fixtures/observe-response.json", import.meta.url)), "utf8");

const CREATED = "https://github.com/ShivaeDev/antumbra/pull/23\n";

const requestFor = (site: Berthed): OpenChangeRequest => ({
	base: null,
	berth: site.berth,
	body: "sounded three fathoms\n\nthe eastern spit is charted\n",
	draft: false,
	headSha: site.headSha,
	repo: site.repo,
	submissionId: "change-1",
	title: "chart the eastern spit",
});

const withBerth = <A, E, R>(body: (gh: ScriptedGh, site: Berthed) => Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
	Effect.scoped(
		Effect.gen(function* () {
			const gh = yield* scriptedGh;
			const site = yield* berthed;
			gh.answer("graphql", { out: RECORDED });
			gh.answer("list", { out: "[]\n" });
			return yield* body(gh, site);
		}),
	);

describe("opening a change on GitHub", () => {
	it.live("pushes the berth's branch and opens a pull request on it", () =>
		withBerth((gh, site) =>
			Effect.gen(function* () {
				gh.answer("create", { out: CREATED });
				const host = yield* makeGitHubHost({ executable: gh.executable });

				const opened = yield* host.open(requestFor(site));

				expect(remoteBranches(site.remote)).toEqual(["refs/heads/main", `refs/heads/${BRANCH}`]);
				const received = gh.received();
				expect(received).toContain("--head");
				expect(received).toContain(BRANCH);
				expect(received).toContain("--base");
				expect(received).toContain("main");
				expect(received).toContain("--repo");
				expect(received).toContain("ShivaeDev/antumbra");
				// why: a multi-line body travels as one argument, unquoted and
				// unescaped, because no shell stands between this and gh.
				expect(received).toContain("sounded three fathoms\n\nthe eastern spit is charted\n");
				expect(received).not.toContain("--draft");
				expect(opened.externalId).toBe("23");
			}),
		),
	);

	it.live("marks the pull request a draft when the change is one", () =>
		withBerth((gh, site) =>
			Effect.gen(function* () {
				gh.answer("create", { out: CREATED });
				const host = yield* makeGitHubHost({ executable: gh.executable });
				yield* host.open({ ...requestFor(site), base: "trunk", draft: true });
				const received = gh.received();
				expect(received).toContain("--draft");
				expect(received).toContain("trunk");
			}),
		),
	);

	it.live("pushes the prepared head when the berth advances before opening", () =>
		withBerth((gh, site) =>
			Effect.gen(function* () {
				gh.answer("create", { out: CREATED });
				const request = requestFor(site);
				advanceBerth(site.berth.path);
				const host = yield* makeGitHubHost({ executable: gh.executable });

				yield* host.open(request);

				expect(refSha(site.remote, `refs/heads/${BRANCH}`)).toBe(request.headSha);
			}),
		),
	);

	// why: opening twice must not fail the second time — an agent that retried,
	// or a berth reopened after a restart, is describing a change that already
	// exists, and the right answer is that change rather than a refusal.
	it.live("adopts the pull request a branch already has", () =>
		withBerth((gh, site) =>
			Effect.gen(function* () {
				gh.answer("list", { out: '[{"number":23}]\n' });
				const host = yield* makeGitHubHost({ executable: gh.executable });

				const opened = yield* host.open(requestFor(site));

				expect(opened.externalId).toBe("23");
				const received = gh.received();
				expect(received).toContain("list");
				expect(received).toContain("--head");
				expect(received).toContain(BRANCH);
				expect(received).toContain("--state");
				expect(received).toContain("open");
				expect(received).not.toContain("create");
			}),
		),
	);

	it.live("recovers a lost response through branch lookup without another create", () =>
		withBerth((gh, site) =>
			Effect.gen(function* () {
				gh.answer("list", { out: "[]\n" });
				gh.answer("create", { out: CREATED });
				gh.answer("graphql", { out: "{" });
				const first = yield* makeGitHubHost({ executable: gh.executable });

				const lost = yield* Effect.flip(first.open(requestFor(site)));
				expect(lost._tag).toBe("ChangeHostUnavailable");
				expect(gh.received().filter((argument) => argument === "create")).toHaveLength(1);

				gh.answer("list", { out: "{" });
				const uncertain = yield* makeGitHubHost({
					executable: gh.executable,
				});
				const refused = yield* Effect.flip(uncertain.open(requestFor(site)));
				expect(refused._tag).toBe("ChangeHostUnavailable");
				expect(gh.received().filter((argument) => argument === "create")).toHaveLength(1);

				gh.answer("list", { out: '[{"number":23}]\n' });
				gh.answer("graphql", { out: RECORDED });
				const recovered = yield* makeGitHubHost({
					executable: gh.executable,
				});
				const opened = yield* recovered.open(requestFor(site));

				expect(opened.externalId).toBe("23");
				expect(gh.received().filter((argument) => argument === "create")).toHaveLength(1);
			}),
		),
	);

	it.live("refuses a berth whose branch cannot be pushed", () =>
		withBerth((gh, site) =>
			Effect.gen(function* () {
				const host = yield* makeGitHubHost({ executable: gh.executable });
				const failure = yield* Effect.flip(
					host.open({
						...requestFor(site),
						berth: { ...site.berth, branch: "main" },
					}),
				);
				expect(failure._tag).toBe("ChangeHostRefused");
				expect(failure.message).toContain("only work/ branches may be pushed");
				expect(gh.received()).toEqual([]);
			}),
		),
	);

	it.live("refuses a repo that does not live on this host", () =>
		withBerth((gh, site) =>
			Effect.gen(function* () {
				const host = yield* makeGitHubHost({ executable: gh.executable });
				const failure = yield* Effect.flip(
					host.open({
						...requestFor(site),
						repo: { ...site.repo, source: "/somewhere/reef" },
					}),
				);
				expect(failure._tag).toBe("ChangeHostRefused");
				expect(failure.message).toContain("not a GitHub repository");
			}),
		),
	);
});
