import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { makeCodexServer } from "#server.ts";
import { askedFor, makeFakeAppServer } from "#test/fake.ts";

it.live("the app server is pointed at the folder Antumbra keeps its skills in", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const fake = makeFakeAppServer();
			yield* makeCodexServer({ skills: "/antumbra/skills", spawn: () => fake.process });
			expect(askedFor(fake, "skills/extraRoots/set")).toEqual({ extraRoots: ["/antumbra/skills"] });
		}),
	),
);

it.live("the app server constrained sessions run on is pointed at no skills at all", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const fake = makeFakeAppServer();
			yield* makeCodexServer({ skills: undefined, spawn: () => fake.process });
			expect(fake.requests.map((request) => request.method)).toEqual(["initialize"]);
		}),
	),
);
