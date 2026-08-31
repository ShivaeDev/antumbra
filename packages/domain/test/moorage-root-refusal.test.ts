import type { DatabaseService, NewAgentSession } from "@antumbra/persistence";
import type { MooragePlan } from "@antumbra/plugin-api";
import { it } from "@antumbra/testing-runtime/domain";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import type { SpawnFields } from "#index.ts";
import { makeEnsureSessionRow } from "#moorage-session.ts";

const AGENT = "agent-two-roots";

const payload: SpawnFields = {
	agentId: AGENT,
	backend: "scripted",
	charter: "answer through one Session",
	role: "hand",
	runner: "local",
	sessionId: "session-second",
};

const plan: MooragePlan = { berths: [], root: `/tmp/moorage/${AGENT}` };

const seed = (db: DatabaseService) =>
	Effect.gen(function* () {
		yield* db.Agent.create({
			charter: payload.charter,
			currentSessionId: payload.sessionId,
			id: AGENT,
			role: payload.role,
			status: "spawning",
		});
		yield* db.AgentSession.create({
			agentId: AGENT,
			backend: "scripted",
			charterDeliveredAt: null,
			completeness: "recording",
			cwd: plan.root,
			executionStatus: "active",
			id: "session-first",
			kind: null,
			label: null,
			nativeRef: null,
			outcome: null,
			parentSessionId: null,
			rootSessionId: "session-first",
			status: "open",
		} satisfies NewAgentSession);
	});

// The partial unique index is the final database guard; this seam returns the domain refusal first.
it.effectApp("a second open root is refused by name, not by the index", function* ({ db }) {
	const ensureSessionRow = yield* makeEnsureSessionRow;
	yield* seed(db);

	const refusal = yield* ensureSessionRow(payload, plan).pipe(
		Effect.match({
			onFailure: (failure) => failure,
			onSuccess: () => null,
		}),
	);
	expect(refusal?._tag).toBe("AgentRootAlreadyOpen");
	if (refusal?._tag === "AgentRootAlreadyOpen") {
		expect(refusal.openSessionId).toBe("session-first");
		expect(refusal.sessionId).toBe("session-second");
		expect(refusal.message).toContain("session-first");
	}
	expect((yield* db.AgentSession.all()).map((row) => row.id)).toEqual(["session-first"]);
});
