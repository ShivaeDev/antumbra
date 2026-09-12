import { it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { expect } from "vitest";
import { bind, defineTool } from "#define.ts";

const context = { agentId: "bound-agent", sessionId: "session", callId: "call" };

it.effect("decodes input without replacing the bound caller", () =>
	Effect.gen(function* () {
		const tool = bind(defineTool({ name: "record", description: "Record text", input: Schema.Struct({ text: Schema.String }) }), (identity, input) =>
			Effect.succeed({ ok: true, text: `${identity.agentId}: ${input.text}` }),
		);
		expect(yield* tool.invoke(context, { agentId: "model-supplied", text: "hello" })).toEqual({ ok: true, text: "bound-agent: hello" });
		expect(yield* tool.invoke(context, { text: 12 })).toMatchObject({ ok: false });
	}),
);

it.effect("represents and accepts no-argument tools as objects", () =>
	Effect.gen(function* () {
		const spec = defineTool({ name: "read", description: "Read", input: Schema.Struct({}) });
		const tool = bind(spec, () => Effect.succeed({ ok: true, text: "read" }));
		expect(spec.inputSchema).toEqual({ additionalProperties: false, properties: {}, required: [], type: "object" });
		expect(tool.spec).toEqual({ name: "read", description: "Read", inputSchema: spec.inputSchema });
		expect(yield* tool.invoke(context, undefined)).toEqual({ ok: true, text: "read" });
	}),
);
