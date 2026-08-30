import type { DirectTool } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { domainCapabilityLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence } from "#test/harness.ts";
import { VoyageProcedureService } from "#voyage-procedures.ts";
import { makeVoyageReadingToolCompiler } from "#voyage-reading-tools.ts";

const readVoyage = (tools: ReadonlyArray<DirectTool>) =>
	Option.getOrThrow(
		Option.fromUndefinedOr(tools.find((tool) => tool.name === "read_voyage")),
	);

it.live("an agent reads a voyage it names", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			const voyages = yield* VoyageProcedureService;
			const compile = yield* makeVoyageReadingToolCompiler;
			const shoals = yield* voyages.open({
				backend: "scripted",
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
		}).pipe(Effect.provide(domainCapabilityLayer(temporary)));
	}),
);
