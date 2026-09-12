import type { OpenRequest } from "@antumbra/platform-vocabulary/change-host.ts";
import { expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { makeGitHubHost } from "#host.ts";
import { GhProcess } from "#process.ts";
import recorded from "#test/fixtures/observe-response.json";
import { scriptedGh } from "#test/scripted-gh.ts";

const request: OpenRequest = {
	repo: { id: "repo", name: "antumbra", source: "https://github.com/ShivaeDev/antumbra", defaultRef: "main" },
	berth: { branch: "work/chart", path: "/runner-only/berth" },
	submissionId: "change-1",
	headSha: "prepared-sha",
	base: null,
	title: "Chart coast",
	body: "Soundings\n\nThree fathoms",
	draft: true,
};

it.effect("observes an accepted publication after its answer was lost and it merged", () =>
	Effect.gen(function* () {
		let accepted = false;
		const process = Layer.succeed(GhProcess, {
			run: (command) =>
				Effect.sync(() => {
					if (command.args[1] === "list") {
						const all = command.args.includes("all");
						return {
							exitCode: 0,
							stderr: "",
							stdout: JSON.stringify(accepted && all ? [{ number: 23, headRefOid: request.headSha, baseRefName: "main", state: "MERGED" }] : []),
						};
					}
					if (command.args[1] === "create") {
						accepted = true;
						return { exitCode: 1, stderr: "connection reset", stdout: "" };
					}
					return { exitCode: 0, stderr: "", stdout: JSON.stringify(recorded) };
				}),
		});
		const first = yield* makeGitHubHost({ executable: "gh" }).pipe(Effect.provide(process));
		expect((yield* Effect.flip(first.open(request)))._tag).toBe("ChangeHostUnavailable");
		const next = yield* makeGitHubHost({ executable: "gh" }).pipe(Effect.provide(process));
		const observed = yield* next.open(request);
		expect(observed.externalId).toBe("23");
		expect(observed.stage).toBe("landed");
	}),
);

it.effect("opens the frozen publication using separate arguments", () =>
	Effect.gen(function* () {
		const gh = yield* scriptedGh;
		gh.answer("list", { out: "[]" });
		gh.answer("create", { out: "https://github.com/ShivaeDev/antumbra/pull/23\n" });
		gh.answer("graphql", { out: JSON.stringify(recorded) });
		const host = yield* makeGitHubHost({ executable: "gh" }).pipe(Effect.provide(gh.layer));
		expect((yield* host.open(request)).externalId).toBe("23");
		expect(gh.received()).toContain(request.body);
		expect(gh.received()).toContain("--draft");
		expect(gh.received()).not.toContain(request.berth.path);
	}),
);

it.effect("refuses an active branch pull with different prepared evidence", () =>
	Effect.gen(function* () {
		const gh = yield* scriptedGh;
		gh.answer("list", { out: JSON.stringify([{ number: 23, headRefOid: "another-sha", baseRefName: "main", state: "OPEN" }]) });
		const host = yield* makeGitHubHost({ executable: "gh" }).pipe(Effect.provide(gh.layer));
		const failure = yield* Effect.flip(host.open(request));
		expect(failure._tag).toBe("ChangeHostRefused");
		expect(failure.detail).toContain("different head or base");
	}),
);
