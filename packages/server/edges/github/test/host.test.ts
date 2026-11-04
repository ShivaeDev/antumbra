import { githubStory } from "@antumbra/app-testing/github.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { allAnswered, node, repo } from "#test/kit.ts";

githubStory.it("reads full and partial GraphQL answers through the shared authenticated client", [], function* ({ host, reply, http }) {
	yield* reply({ data: { r_0: { pr_0: node(23, "MERGED"), pr_1: null } }, errors: [{ message: "not found", path: ["r_0", "pr_1"] }] });
	const seen = yield* host.observe([
		{ repo, externalId: "23" },
		{ repo, externalId: "9999" },
	]);
	expect(seen.map((value) => [value.externalId, value.stage])).toEqual([["23", "landed"]]);
	expect(http.requests[0]).toMatchObject({ method: "POST", path: "/graphql", headers: { authorization: "Bearer loopback-token" } });
	yield* reply({ data: { r_0: { pr_0: node(23) } } });
	expect((yield* host.adopt("https://github.com/ShivaeDev/antumbra/pull/23", repo)).stage).toBe("open");
});

githubStory.it("leaves selections with failed feedback unobserved even when GitHub includes empty fields", [], function* ({ host, reply }) {
	yield* reply({ data: { r_0: { pr_0: node(23), pr_1: node(24) } }, errors: [{ message: "reviews unavailable", path: ["r_0", "pr_1", "reviews"] }] });
	expect(
		(yield* host.observe([
			{ repo, externalId: "23" },
			{ repo, externalId: "24" },
		])).map((value) => value.externalId),
	).toEqual(["23"]);
});

githubStory.it(
	"invalidates the entire pass and its cached capability after an authentication failure",
	[],
	function* ({ host, replyWith, authenticated }) {
		expect((yield* host.capability).available).toBe(true);
		yield* replyWith((request) =>
			request.body.includes("number: 26") ? { status: 401, body: { message: "Bad credentials" } } : allAnswered(request),
		);
		const refs = Array.from({ length: 26 }, (_, index) => ({ repo, externalId: String(index + 1) }));
		expect(yield* Effect.flip(host.observe(refs))).toMatchObject({
			_tag: "ChangeHostUnavailable",
			detail: expect.stringContaining("authentication"),
		});
		yield* authenticated(false);
		expect((yield* host.capability).available).toBe(false);
	},
);

githubStory.it("uses the Enterprise GraphQL endpoint and the Enterprise CLI credential", [], function* ({ enterprise, reply, http }) {
	const remote = { ...repo, source: "https://git.corp.test/ShivaeDev/antumbra.git" };
	yield* reply({ data: { r_0: { pr_0: node(23, "OPEN", "git.corp.test") } } });
	expect(enterprise.supports(remote)).toBe(true);
	expect((yield* enterprise.adopt("https://git.corp.test/ShivaeDev/antumbra/pull/23", remote)).url).toBe(
		"https://git.corp.test/ShivaeDev/antumbra/pull/23",
	);
	expect(http.requests[0]).toMatchObject({ path: "/api/graphql", headers: { authorization: "Bearer loopback-token" } });
});

githubStory.it("refuses an address belonging to another repository before making a request", [], function* ({ host, http }) {
	expect(yield* Effect.flip(host.adopt("https://github.com/someone/elsewhere/pull/5", repo))).toMatchObject({ _tag: "ChangeHostRefused" });
	expect(http.requests).toEqual([]);
});
