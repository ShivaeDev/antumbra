import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ChangeHostRepo } from "@antumbra/plugin-api";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { makeGitHubHost } from "#host.ts";
import {
	AUTHENTICATED,
	type ScriptedAnswer,
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

const WATCHED = [{ externalId: "23", repo: REPO }];

// why: what a failing gateway actually puts on the wire — gh exits nonzero,
// names the status on stderr, and hands back a proxy's error page on the
// stream a partial GraphQL answer would have arrived on.
const BAD_GATEWAY: ScriptedAnswer = {
	code: 1,
	err: "gh: Something went wrong (HTTP 502)\n",
	out: "<html><head><title>502 Bad Gateway</title></head></html>\n",
};

const withGh = <A, E, R>(
	body: (gh: ScriptedGh) => Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R> => Effect.scoped(Effect.flatMap(scriptedGh, body));

const hostOf = (gh: ScriptedGh) =>
	makeGitHubHost({ executable: gh.executable });

describe("a GitHub that falters mid-watch", () => {
	it.live("says it could not be reached rather than that all is calm", () =>
		withGh((gh) =>
			Effect.gen(function* () {
				gh.answer("auth", AUTHENTICATED);
				gh.answer("graphql", BAD_GATEWAY);
				const host = yield* hostOf(gh);

				const failure = yield* Effect.flip(host.observe(WATCHED));
				expect(failure._tag).toBe("ChangeHostUnavailable");
				expect(failure.message).toContain("HTTP 502");
			}),
		),
	);

	it.live("answers the pass after the gateway comes back", () =>
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

	// why: a run of gateway failures disproves nothing about the login, so the
	// answer gh gave a moment ago still stands — a 401 is the failure that
	// throws it away, and re-probing on every failed pass would spend a process
	// per pass on a question GitHub is in no state to answer.
	it.live("keeps the login it cached through a run of failures", () =>
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
