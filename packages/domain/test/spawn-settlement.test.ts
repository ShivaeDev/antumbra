import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import type { SpawnFields } from "#index.ts";
import { settlementFor } from "#spawn-current-session.ts";

const payload: SpawnFields = {
	agentId: "agent-birth",
	backend: "scripted",
	charter: "sound the shallows",
	role: "hand",
	runner: "local",
	sessionId: "session-birth",
};

const stored = (status: string, currentSessionId: string | null) => ({
	currentSessionId,
	id: payload.agentId,
	status,
});

it.effect("reclaims the birth whose Session the Agent still holds", () =>
	Effect.gen(function* () {
		expect(yield* settlementFor(stored("spawning", "session-birth"), payload)).toBe("reclaim");
	}),
);

it.effect("leaves an Agent someone else already settled alone", () =>
	Effect.gen(function* () {
		expect(yield* settlementFor(stored("dormant", null), payload)).toBe("settled");
		expect(yield* settlementFor(stored("alive", "session-birth"), payload)).toBe("settled");
	}),
);

it.effect("names an Agent left spawning that this settlement cannot reach", () =>
	Effect.gen(function* () {
		const refusal = yield* Effect.flip(settlementFor(stored("spawning", "session-elsewhere"), payload));
		expect(refusal._tag).toBe("AgentBirthStranded");
		if (refusal._tag === "AgentBirthStranded") {
			expect(refusal.agentId).toBe("agent-birth");
			expect(refusal.sessionId).toBe("session-birth");
			expect(refusal.message).toContain("session-elsewhere");
		}
		const pointerless = yield* Effect.flip(settlementFor(stored("spawning", null), payload));
		expect(pointerless._tag).toBe("AgentBirthStranded");
	}),
);
