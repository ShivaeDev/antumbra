import type { HostRepo } from "@antumbra/platform-change-host/schema.ts";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { makeGitHubHost } from "#host.ts";
import recorded from "#test/fixtures/observe-response.json";
import { AUTHENTICATED, type ScriptedAnswer, type ScriptedGh, scriptedGh } from "#test/scripted-gh.ts";

const RECORDED = JSON.stringify(recorded);

const REPO: HostRepo = {
	defaultRef: "main",
	id: "repo-antumbra",
	name: "antumbra",
	source: "https://github.com/ShivaeDev/antumbra.git",
};

const WATCHED = [{ externalId: "23", repo: REPO }];

const BAD_GATEWAY: ScriptedAnswer = {
	code: 1,
	err: "gh: Something went wrong (HTTP 502)\n",
	out: "<html><head><title>502 Bad Gateway</title></head></html>\n",
};

const withGh = <A, E, R>(body: (gh: ScriptedGh) => Effect.Effect<A, E, R>): Effect.Effect<A, E, R> => Effect.scoped(Effect.flatMap(scriptedGh, body));

const hostOf = (gh: ScriptedGh) => makeGitHubHost({ executable: gh.executable }).pipe(Effect.provide(gh.layer));

describe("a GitHub that falters mid-watch", () => {
	it.effect("says it could not be reached rather than that all is calm", () =>
		withGh((gh) =>
			Effect.gen(function* () {
				gh.answer("auth", AUTHENTICATED);
				gh.answer("graphql", BAD_GATEWAY);
				const host = yield* hostOf(gh);

				const failure = yield* Effect.flip(host.observe(WATCHED));
				expect(failure._tag).toBe("ChangeHostUnavailable");
				expect(failure.detail).toContain("HTTP 502");
			}),
		),
	);

	it.effect("answers the pass after the gateway comes back", () =>
		withGh((gh) =>
			Effect.gen(function* () {
				gh.answer("auth", AUTHENTICATED);
				gh.answer("graphql", BAD_GATEWAY);
				const host = yield* hostOf(gh);
				yield* Effect.flip(host.observe(WATCHED));

				gh.answer("graphql", { out: RECORDED });
				const seen = yield* host.observe(WATCHED);
				expect(seen.map((one) => one.externalId)).toEqual(["23"]);
				expect(seen[0]?.stage).toBe("landed");
			}),
		),
	);

	it.effect("keeps the login it cached through a run of failures", () =>
		withGh((gh) =>
			Effect.gen(function* () {
				gh.answer("auth", AUTHENTICATED);
				gh.answer("graphql", BAD_GATEWAY);
				const host = yield* hostOf(gh);
				expect((yield* host.capability).available).toBe(true);

				yield* Effect.flip(host.observe(WATCHED));
				yield* Effect.flip(host.observe(WATCHED));
				yield* Effect.flip(host.observe(WATCHED));

				expect((yield* host.capability).available).toBe(true);
				expect(gh.received().filter((arg) => arg === "status")).toHaveLength(1);
			}),
		),
	);
});
