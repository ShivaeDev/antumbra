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
