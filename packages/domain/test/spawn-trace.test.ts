import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import type { SpawnFields } from "#index.ts";
import { underSpawnedAgent } from "#spawn-trace.ts";

const crew: SpawnFields = {
	agentId: "agent-traced",
	backend: "scripted",
	charter: "sound the shallows",
	pieceId: "piece-traced",
	role: "hand",
	runner: "local",
	sessionId: "session-traced",
	voyageId: "voyage-traced",
};

const hand: SpawnFields = {
	agentId: "agent-hand",
	backend: "scripted",
	charter: "sound the shallows",
	role: "hand",
	runner: "local",
	sessionId: "session-hand",
};

const attributes = Effect.currentSpan.pipe(
	Effect.map((span) => span.attributes),
);

// why: the birth opens no span of its own, so the annotation is only worth
// anything on a span something below it opens — read two levels down, the depth
// a provisioning step reaches before it reports.
const beneathBirth = (payload: SpawnFields) =>
	attributes.pipe(
		Effect.withSpan("git.refreshMirror"),
		Effect.withSpan("provision-moorage"),
		underSpawnedAgent(payload),
	);

it.effect("carries the Agent's ids onto spans opened beneath the birth", () =>
	Effect.gen(function* () {
		const carried = yield* beneathBirth(crew);
		expect(carried.get("agentId")).toBe("agent-traced");
		expect(carried.get("sessionId")).toBe("session-traced");
		expect(carried.get("pieceId")).toBe("piece-traced");
	}),
);

it.effect("names no Piece for a birth that answers to none", () =>
	Effect.gen(function* () {
		const carried = yield* beneathBirth(hand);
		expect(carried.get("agentId")).toBe("agent-hand");
		expect(carried.get("sessionId")).toBe("session-hand");
		expect(carried.has("pieceId")).toBe(false);
	}),
);

it.effect("leaves a span outside the birth unannotated", () =>
	Effect.gen(function* () {
		const carried = yield* attributes.pipe(Effect.withSpan("dispatcher.pass"));
		expect(carried.has("agentId")).toBe(false);
		expect(carried.has("sessionId")).toBe(false);
	}),
);
