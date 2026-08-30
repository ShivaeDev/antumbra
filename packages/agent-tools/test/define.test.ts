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
	expect(landArtifactSpec.inputSchema.required).toEqual(["path", "title"]);
	expect(supersedeArtifactSpec.inputSchema.required).toEqual(["successorArtifactId", "supersededArtifactId"]);
	expect(removeArtifactSupersessionSpec.inputSchema.required).toEqual(["successorArtifactId", "supersededArtifactId"]);
	expect(writeBoardSpec.inputSchema.required).toEqual(["body", "register", "scope"]);
	expect(readBoardSpec.inputSchema.required).toEqual(["scope"]);
	expect(requestRulingSpec.inputSchema.required).toEqual(["context", "question", "radius", "urgency"]);
	expect(charterPieceSpec.inputSchema.required).toEqual(["charter", "dependsOn", "expectation", "role", "title"]);
	expect(launchPieceSpec.inputSchema.required).toEqual(["pieceId"]);
	expect(parkPieceSpec.inputSchema.required).toEqual(["pieceId"]);
	expect(unparkPieceSpec.inputSchema.required).toEqual(["pieceId"]);
	expect(rewirePieceSpec.inputSchema.required).toEqual(["dependsOn", "pieceId"]);
	expect(readRulingsSpec.inputSchema).not.toHaveProperty("required");
	expect(readRulingsSpec.inputSchema.properties).toMatchObject({
		tags: {
			anyOf: expect.arrayContaining([expect.objectContaining({ items: { type: "string" }, type: "array" })]),
		},
	});
	expect(readVoyageSpec.inputSchema).not.toHaveProperty("required");
	expect(readVoyageSpec.inputSchema.properties).toHaveProperty("voyageId");
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

it("a list of ids reaches the model as an array of strings", () => {
	expect(rewirePieceSpec.inputSchema.properties).toMatchObject({
		dependsOn: { items: { type: "string" }, type: "array" },
	});
});

it("a closed set of choices reaches the model as an enum", () => {
	expect(writeBoardSpec.inputSchema.properties).toMatchObject({
		register: { enum: ["rough", "smooth"] },
		scope: { enum: ["piece", "self", "voyage"] },
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

it.effect("land_artifact accepts only a Moorage-relative path", () =>
	Effect.gen(function* () {
		const tool = bind(landArtifactSpec, (input) => Effect.succeed({ ok: true, text: input.path }));
		expect(yield* tool.call({ path: "results/reef.md", title: "Reef" })).toEqual({ ok: true, text: "results/reef.md" });
		for (const path of ["https://example.test/reef.md", "file:///tmp/reef.md", "/tmp/reef.md", "C:\\reef.md"]) {
			expect(yield* tool.call({ path, title: "Reef" })).toMatchObject({
				ok: false,
			});
		}
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
