import { DIRECT_TOOL_NAME } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { landArtifactSpec, landReportSpec, standDownSpec } from "#crew.ts";
import { bind, defineTool } from "#define.ts";

const specs = [landReportSpec, landArtifactSpec, standDownSpec];

it("every spec is named the way both harnesses accept", () => {
	for (const spec of specs) {
		expect(spec.name, spec.name).toMatch(DIRECT_TOOL_NAME);
		expect(spec.description.length, spec.name).toBeGreaterThan(20);
	}
});

it("every spec emits a closed object schema", () => {
	for (const spec of specs) {
		expect(spec.inputSchema, spec.name).toMatchObject({
			additionalProperties: false,
			type: "object",
		});
	}
	expect(landReportSpec.inputSchema.required).toEqual(["body", "title"]);
	expect(landArtifactSpec.inputSchema.required).toEqual(["title", "uri"]);
	expect(standDownSpec.inputSchema).toEqual({
		additionalProperties: false,
		properties: {},
		required: [],
		type: "object",
	});
});

it("field descriptions reach the schema the model reads", () => {
	expect(landReportSpec.inputSchema.properties).toMatchObject({
		body: { description: expect.any(String), type: "string" },
		title: { description: expect.any(String), type: "string" },
	});
});

const echo = defineTool({
	description: "Echo a line back, for the tests only.",
	input: Schema.Struct({ line: Schema.String }),
	name: "echo",
});

it.effect("a bound tool passes decoded arguments to its handler", () =>
	Effect.gen(function* () {
		const tool = bind(echo, (input) =>
			Effect.succeed({ ok: true, text: input.line }),
		);
		expect(yield* tool.call({ line: "aye" })).toEqual({
			ok: true,
			text: "aye",
		});
	}),
);

it.effect(
	"arguments the schema refuses come back as a refusal, not a crash",
	() =>
		Effect.gen(function* () {
			const tool = bind(echo, (input) =>
				Effect.succeed({ ok: true, text: input.line }),
			);
			const outcome = yield* tool.call({ line: 7 });
			expect(outcome.ok).toBe(false);
			expect(outcome.text).toContain("echo");
		}),
);

it.effect("a tool that takes no arguments accepts an absent payload", () =>
	Effect.gen(function* () {
		const tool = bind(standDownSpec, () =>
			Effect.succeed({ ok: true, text: "standing down" }),
		);
		expect(yield* tool.call(undefined)).toEqual({
			ok: true,
			text: "standing down",
		});
	}),
);
