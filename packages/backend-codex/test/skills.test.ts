import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { makeCodexServer } from "#server.ts";
import { makeFakeAppServer } from "#test/fake.ts";

it.live("the app server is pointed at the folder Antumbra keeps its skills in", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const fake = makeFakeAppServer();
			yield* makeCodexServer({ skills: "/antumbra/skills", spawn: () => fake.process });
			const offered = fake.requests.find((request) => request.method === "skills/extraRoots/set");
			expect(offered?.params).toEqual({ extraRoots: ["/antumbra/skills"] });
		}),
	),
);
