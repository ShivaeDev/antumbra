import { Pieces } from "@antumbra/pieces";
import type { DirectTool, DirectToolOutcome } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { makePieceVerbToolCompiler } from "#captain-pieces.ts";
import { domainCapabilityLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence } from "#test/harness.ts";
import { openReefVoyage } from "#test/voyage-fixtures.ts";
import { makeVoyageReadingToolCompiler } from "#voyage-reading-tools.ts";

const PACE = "this voyage has 0 pieces running and 1 waiting for capacity; the fleet runs at most 4 agents at once";

const call = (tools: ReadonlyArray<DirectTool>, name: string, input: unknown): Effect.Effect<DirectToolOutcome> =>
	Option.match(Option.fromUndefinedOr(tools.find((tool) => tool.name === name)), {
		onNone: () => Effect.die(`the captain has no ${name} tool`),
		onSome: (tool) => tool.call(input),
	});

it.live("the launch reply and the voyage reading say what runs, what waits, and how many the fleet runs at once", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			const pieces = yield* Pieces;
			const voyage = yield* openReefVoyage;
			const alpha = yield* pieces.charter({
				charter: "sound the eastern shoal",
				dependsOn: [],
				expectation: "the shoal is sounded",
				role: "hand",
				title: "eastern",
				voyageId: voyage.id,
			});
			const identity = {
				agentId: "captain-1",
				pieceId: Option.none<string>(),
				sessionId: "session-1",
				voyageId: Option.some(voyage.id),
			};
			const tools = [...(yield* makePieceVerbToolCompiler)(identity), ...(yield* makeVoyageReadingToolCompiler)(identity)];

			expect(yield* call(tools, "launch_piece", { pieceId: alpha.id })).toEqual({ ok: true, text: `launched into the pool\n${PACE}` });

			const read = yield* call(tools, "read_voyage", {});

			expect(read.text).toContain(PACE);
		}).pipe(Effect.provide(domainCapabilityLayer(temporary)));
	}),
);
