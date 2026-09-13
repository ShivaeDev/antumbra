import { listCodexModels } from "@antumbra/runner-backends-codex/models.ts";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { makeCodexServer } from "#backends/codex/server.ts";
import { makeFakeAppServer } from "#test/backends/codex/fake.ts";

const catalog = {
	data: [
		{
			defaultReasoningEffort: "high",
			displayName: "GPT-5 Codex",
			isDefault: true,
			model: "gpt-5-codex",
			supportedReasoningEfforts: [
				{ description: "quick", reasoningEffort: "low" },
				{ description: "thorough", reasoningEffort: "high" },
			],
		},
		{
			defaultReasoningEffort: "medium",
			displayName: "GPT-5",
			isDefault: false,
			model: "gpt-5",
			supportedReasoningEfforts: [{ description: "even", reasoningEffort: "medium" }],
		},
	],
	nextCursor: null,
};

const answering = (answer: unknown) => makeFakeAppServer({ scripted: (method) => (method === "model/list" ? Option.some(answer) : Option.none()) });

it.live("codex names the models it offers, the efforts each advertises, and the one it defaults to", () =>
	Effect.gen(function* () {
		const fake = answering(catalog);
		const server = yield* makeCodexServer({ skills: "/antumbra/skills", spawn: () => fake.process });
		expect(yield* listCodexModels(server)).toEqual([
			{ defaultEffort: "high", efforts: ["low", "high"], id: "gpt-5-codex", isDefault: true, name: "GPT-5 Codex" },
			{ defaultEffort: "medium", efforts: ["medium"], id: "gpt-5", isDefault: false, name: "GPT-5" },
		]);
		expect(fake.requests.at(-1)?.method).toBe("model/list");
	}).pipe(Effect.scoped),
);

it.live("a catalog Codex does not answer is a failure rather than an empty list", () =>
	Effect.gen(function* () {
		const fake = answering({ models: [] });
		const server = yield* makeCodexServer({ skills: "/antumbra/skills", spawn: () => fake.process });
		const refused = yield* Effect.flip(listCodexModels(server));
		expect(refused.detail).toContain("model/list returned no catalog");
	}).pipe(Effect.scoped),
);
