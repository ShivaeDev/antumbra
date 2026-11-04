import { githubStory } from "@antumbra/app-testing/github.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { allAnswered, repo } from "#test/kit.ts";

githubStory.it("leaves only a failed batch unobserved and can observe it on a later pass", [], function* ({ host, reply, replyWith }) {
	const refs = Array.from({ length: 26 }, (_, index) => ({ repo, externalId: String(index + 1) }));
	yield* replyWith((request) => (request.body.includes("number: 1)") ? { status: 502, body: { message: "Bad Gateway" } } : allAnswered(request)));
	expect((yield* host.observe(refs)).map((value) => value.externalId)).toEqual(["26"]);
	yield* replyWith(allAnswered);
	expect(yield* host.observe(refs)).toHaveLength(26);
	yield* reply({ message: "Bad Gateway" }, 502);
	expect(yield* Effect.flip(host.observe(refs))).toMatchObject({ _tag: "ChangeHostUnavailable", detail: expect.stringContaining("502") });
});

githubStory.it("preserves its cached login through a gateway failure and refuses unsupported host words", [], function* ({ host, reply }) {
	expect((yield* host.capability).available).toBe(true);
	yield* reply({ message: "Bad Gateway" }, 502);
	yield* Effect.flip(host.observe([{ repo, externalId: "23" }]));
	expect((yield* host.capability).available).toBe(true);
});
