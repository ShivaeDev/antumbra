import type { DirectTool } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { piToolAnswer, piTools } from "#adapters/tools.ts";

const SCHEMA = { properties: { entry: { type: "string" } }, required: ["entry"], type: "object" };

const tool: DirectTool = {
	call: () => Effect.succeed({ ok: true, text: "unused" }),
	description: "Post an entry on a board",
	inputSchema: SCHEMA,
	name: "post_board_entry",
};

const answering = (ok: boolean, text: string) => piToolAnswer(tool, () => Promise.resolve({ ok, text }));

it("hands pi the tool's own name, description, and input schema", () => {
	expect(piTools([tool], () => Promise.resolve({ ok: true, text: "" }))[0]).toMatchObject({
		description: "Post an entry on a board",
		name: "post_board_entry",
		parameters: SCHEMA,
	});
});

it.effect("returns what the tool said as text content", () =>
	Effect.map(
		Effect.promise(() => answering(true, "entry posted")("call-1", { entry: "hello" })),
		(result) => {
			expect(result.content).toEqual([{ text: "entry posted", type: "text" }]);
		},
	),
);

it.effect("throws a refusal so pi hands the model an error result", () =>
	Effect.map(Effect.exit(Effect.tryPromise(() => answering(false, "that board is closed")("call-1", { entry: "hello" }))), (outcome) => {
		expect(outcome._tag).toBe("Failure");
	}),
);
