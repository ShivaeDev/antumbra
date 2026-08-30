import { DIRECT_TOOL_NAME } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { readBoardSpec, writeBoardSpec } from "#boards.ts";
import { charterPieceSpec, launchPieceSpec, parkPieceSpec, readVoyageSpec, rewirePieceSpec, unparkPieceSpec } from "#captain.ts";
import { landArtifactSpec, landReportSpec, removeArtifactSupersessionSpec, standDownSpec, supersedeArtifactSpec } from "#crew.ts";
import { bind, defineTool } from "#define.ts";
import { readRulingsSpec } from "#ruling-readings.ts";
import { requestRulingSpec } from "#rulings.ts";

const specs = [
	landReportSpec,
	landArtifactSpec,
	supersedeArtifactSpec,
	removeArtifactSupersessionSpec,
	charterPieceSpec,
	launchPieceSpec,
	parkPieceSpec,
	unparkPieceSpec,
	rewirePieceSpec,
	readVoyageSpec,
	readBoardSpec,
	writeBoardSpec,
	requestRulingSpec,
	standDownSpec,
	readRulingsSpec,
];

it("every spec is named the way both harnesses accept", () => {
	for (const spec of specs) {
		expect(spec.name, spec.name).toMatch(DIRECT_TOOL_NAME);
	}
});

it("emits a closed object schema the model can fill", () => {
	expect(landReportSpec.inputSchema).toMatchObject({
		additionalProperties: false,
		type: "object",
	});
	expect(landReportSpec.inputSchema.required).toEqual(["body", "title"]);
});

it("emits a plain object schema for a tool that takes no arguments", () => {
	expect(standDownSpec.inputSchema).toEqual({
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
		const tool = bind(standDownSpec, () => Effect.succeed({ ok: true, text: "standing down" }));
		expect(yield* tool.call(undefined)).toEqual({
			ok: true,
			text: "standing down",
		});
	}),
);
