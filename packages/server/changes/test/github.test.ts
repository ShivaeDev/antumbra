import { answered } from "@antumbra/app-testing/answers.ts";
import { pullRequest } from "@antumbra/app-testing/github-fixtures.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { hasChartedReef, soundings } from "@antumbra/app-testing/postgres-fixtures.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { RepoId } from "@antumbra/platform-vocabulary/repos-ids.ts";
import { selection as changeFeedbackSelection } from "@antumbra/server-storage/records/change-feedback.ts";
import { Effect } from "effect";
import { expect } from "vitest";

const repoId = RepoId.make("github:antumbra");
const repo = { id: repoId, name: "antumbra", source: "https://github.com/ShivaeDev/antumbra.git", defaultRef: "main" };
const refs = [23, 24].map((number) => ({ repo, externalId: String(number) }));

postgresApp.it(
	"applies full GitHub batches and preserves unobserved Change feedback in partial answers",
	[hasChartedReef],
	function* ({ api, github, recordGitHub, changesHistory, rebuild }) {
		const fixture = yield* github();
		yield* api["repos.register"]({ source: repo.source, defaultRef: "main", requestId: Request.make(repoId) });
		const withFeedback = {
			...pullRequest(24),
			comments: {
				nodes: [
					{
						id: "comment-24",
						author: { login: "octocat" },
						body: "Keep this feedback",
						createdAt: "2026-11-04T12:00:00Z",
						url: "https://github.com/ShivaeDev/antumbra/pull/24#issuecomment-24",
					},
				],
			},
		};
		yield* fixture.reply({ data: { r_0: { pr_0: pullRequest(23), pr_1: withFeedback } } });
		const full = yield* fixture.host.observe(refs);
		for (const observation of full)
			yield* api["changes.adopt"]({
				pieceId: soundings,
				repoId,
				agentId: null,
				host: "github",
				observation,
				observedAt: "2026-11-04T12:00:00Z",
				requestId: Request.make(`adopt:${observation.externalId}`),
			});
		yield* recordGitHub("full", full);
		const feedback = yield* (yield* changesHistory.rows()).changeFeedback
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: changeFeedbackSelection })
			.pipe(Effect.orDie);
		expect(feedback).toMatchObject([{ body: "Keep this feedback" }]);
		yield* fixture.reply({
			data: { r_0: { pr_0: pullRequest(23, "MERGED"), pr_1: pullRequest(24) } },
			errors: [{ message: "comments unavailable", path: ["r_0", "pr_1", "comments"] }],
		});
		const partial = yield* fixture.host.observe(refs);
		expect(partial.map((observation) => observation.externalId)).toEqual(["23"]);
		yield* recordGitHub("partial", partial);
		const changes = yield* answered(api["changes.all"]({}), "changes.all");
		expect(changes.map((row) => [row.externalId, row.stage])).toEqual([
			["23", "landed"],
			["24", "open"],
		]);
		expect(
			yield* (yield* changesHistory.rows()).changeFeedback
				.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: changeFeedbackSelection })
				.pipe(Effect.orDie),
		).toEqual(feedback);
		yield* rebuild();
		expect(yield* answered(api["changes.all"]({}), "changes.all")).toEqual(changes);
		expect(fixture.http.requests.map((request) => request.path)).toEqual(["/graphql", "/graphql"]);
	},
);

postgresApp.it(
	"leaves real Change services unchanged after a GitHub authentication failure",
	[hasChartedReef],
	function* ({ api, github, recordGitHub, clearPublished, published }) {
		const fixture = yield* github();
		yield* api["repos.register"]({ source: repo.source, defaultRef: "main", requestId: Request.make(repoId) });
		yield* fixture.reply({ data: { r_0: { pr_0: pullRequest(23) } } });
		const [observation] = yield* fixture.host.observe([refs[0] ?? { repo, externalId: "23" }]);
		if (observation === undefined) return yield* Effect.die(new Error("full GitHub answer missing"));
		yield* api["changes.adopt"]({
			pieceId: soundings,
			repoId,
			agentId: null,
			host: "github",
			observation,
			observedAt: "2026-11-04T12:00:00Z",
			requestId: Request.make("adopt"),
		});
		const before = yield* answered(api["changes.all"]({}), "changes.all");
		yield* clearPublished();
		yield* fixture.reply({ message: "Bad credentials" }, 401);
		const pass = fixture.host.observe(refs).pipe(Effect.flatMap((values) => recordGitHub("rejected", values)));
		expect(yield* Effect.flip(pass)).toMatchObject({ _tag: "ChangeHostUnavailable" });
		expect(yield* answered(api["changes.all"]({}), "changes.all")).toEqual(before);
		expect(yield* published()).toEqual([]);
	},
);

postgresApp.it(
	"records Enterprise observations in the real Change service through the Enterprise API base",
	[hasChartedReef],
	function* ({ api, github, recordGitHub }) {
		const fixture = yield* github();
		const enterpriseRepo = { ...repo, source: "https://git.corp.test/ShivaeDev/antumbra.git" };
		yield* api["repos.register"]({ source: enterpriseRepo.source, defaultRef: "main", requestId: Request.make(repoId) });
		yield* fixture.reply({ data: { r_0: { pr_0: pullRequest(23, "OPEN", "git.corp.test") } } });
		const observation = yield* fixture.enterprise.adopt("https://git.corp.test/ShivaeDev/antumbra/pull/23", enterpriseRepo);
		yield* api["changes.adopt"]({
			pieceId: soundings,
			repoId,
			agentId: null,
			host: "github",
			observation,
			observedAt: "2026-11-04T12:00:00Z",
			requestId: Request.make("adopt"),
		});
		yield* recordGitHub("enterprise", [observation]);
		expect(yield* answered(api["changes.quay"]({}), "changes.quay")).toMatchObject([
			{ externalId: "23", stage: "open", url: "https://git.corp.test/ShivaeDev/antumbra/pull/23" },
		]);
		expect(fixture.http.requests.map((request) => request.path)).toEqual(["/api/graphql"]);
	},
);
