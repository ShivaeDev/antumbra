import type { DirectTool } from "@antumbra/plugin-api";
import { it } from "@antumbra/testing";
import { Voyages } from "@antumbra/voyages";
import { expect } from "@effect/vitest";
import { Option } from "effect";
import { makeVoyageReadingToolCompiler } from "#voyage-reading-tools.ts";

const readVoyage = (tools: ReadonlyArray<DirectTool>) => Option.getOrThrow(Option.fromUndefinedOr(tools.find((tool) => tool.name === "read_voyage")));

it.effectApp("an agent reads a voyage it names", function* () {
	const voyageRecords = yield* Voyages;
	const compile = yield* makeVoyageReadingToolCompiler;
	const shoals = yield* voyageRecords.open({
		context: "the shoals are unnamed",
		name: "Name the shoals",
		northStar: "every shoal has a name",
	});
	const tool = readVoyage(
		compile({
			agentId: "agent-hand",
			pieceId: Option.none(),
			sessionId: "session-hand",
			voyageId: Option.none(),
		}),
	);

	const read = yield* tool.call({ voyageId: shoals.id });

	expect(read.ok).toBe(true);
	expect(read.text).toContain("# Name the shoals");
});
