import { expect, it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { readMailSpec } from "#boards.ts";
import { landReportSpec } from "#crew.ts";
import { bind, defineTool } from "#define.ts";

it("emits a closed object schema the model can fill", () => {
	expect(landReportSpec.inputSchema).toMatchObject({
		additionalProperties: false,
		type: "object",
	});
	expect(landReportSpec.inputSchema.required).toEqual(["body", "title"]);
});

it("emits a plain object schema for a tool that takes no arguments", () => {
	expect(readMailSpec.inputSchema).toEqual({
		additionalProperties: false,
		properties: {},
		required: [],
		type: "object",
	});
});

const echo = defineTool({
	description: "Echo a line back, for the tests only.",
	input: Schema.Struct({ line: Schema.String }),
	name: "echo",
});

it.effect("a bound tool passes decoded arguments to its handler", () =>
	Effect.gen(function* () {
		const tool = bind(echo, (input) => Effect.succeed({ ok: true, text: input.line }));
		expect(yield* tool.call({ line: "aye" })).toEqual({
			ok: true,
			text: "aye",
		});
	}),
);

it.effect("arguments the schema refuses come back as a refusal, not a crash", () =>
	Effect.gen(function* () {
		const tool = bind(echo, (input) => Effect.succeed({ ok: true, text: input.line }));
		const outcome = yield* tool.call({ line: 7 });
		expect(outcome.ok).toBe(false);
		expect(outcome.text).toContain("echo");
	}),
);

it.effect("a tool that takes no arguments accepts an absent payload", () =>
	Effect.gen(function* () {
		const tool = bind(readMailSpec, () => Effect.succeed({ ok: true, text: "no mail" }));
		expect(yield* tool.call(undefined)).toEqual({
			ok: true,
			text: "no mail",
		});
	}),
);
