import type { DirectTool } from "@antumbra/plugin-api";
import { Effect, Option, Schema } from "effect";
import { DynamicToolCallParams } from "#protocol.ts";
import type { ToolRegistry } from "#tool-registry.ts";

// why: both fields are required by the protocol — a reply missing `success`
// fails the item with a sentinel and puts the real reason on stderr alone.
const answer = (text: string, success: boolean) => ({
	contentItems: [{ text, type: "inputText" }],
	success,
});

const decodeCall = Schema.decodeUnknownOption(DynamicToolCallParams);

const served = (tool: DirectTool, args: unknown) =>
	tool
		.call(args)
		.pipe(Effect.map((outcome) => answer(outcome.text, outcome.ok)));

type Call = typeof DynamicToolCallParams.Type;

const callNamed = (tools: ToolRegistry, call: Call) =>
	tools.lookup(call.threadId, call.tool).pipe(
		Effect.flatMap(
			Option.match({
				onNone: () =>
					Effect.succeed(
						answer(`antumbra serves no tool named ${call.tool}`, false),
					),
				onSome: (tool) => served(tool, call.arguments),
			}),
		),
	);

// why: a call we cannot serve is still a call we answer. Refusing the method
// itself would be a protocol lie — we advertised the tool — and the model
// would learn nothing it could act on.
export const dynamicToolAnswer = (tools: ToolRegistry, params: unknown) =>
	Option.match(decodeCall(params), {
		onNone: () =>
			Effect.succeed(answer("antumbra could not read that tool call", false)),
		onSome: (call) => callNamed(tools, call),
	});
