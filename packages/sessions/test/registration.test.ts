import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { it } from "@antumbra/persistence/testing";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import { ensureRoot } from "#registration/ensure-root.ts";

it.effectDB("registers the reserved root once and refuses a different Session", function* () {
	const db = yield* Database;
	const registration = { agentId: "agent-watch", backend: "scripted", sessionId: "session-watch" };
	yield* db.Agent.create({
		charter: "keep watch",
		currentSessionId: registration.sessionId,
		id: registration.agentId,
		role: "hand",
		status: "spawning",
	});
	yield* ensureRoot(registration, "/watch").pipe(Effect.provide(DomainFeedsLive));
	const first = Option.getOrThrow(yield* db.AgentSession.where({ id: registration.sessionId }).first());
	expect(first).toMatchObject({
		cwd: "/watch",
		executionStatus: "active",
		parentSessionId: null,
		rootSessionId: registration.sessionId,
		status: "open",
	});
	yield* ensureRoot(registration, "/watch").pipe(Effect.provide(DomainFeedsLive));
	expect(yield* db.AgentSession.where({ agentId: registration.agentId }).all()).toEqual([first]);
	expect(
		yield* Effect.flip(ensureRoot({ ...registration, sessionId: "session-other" }, "/watch").pipe(Effect.provide(DomainFeedsLive))),
	).toMatchObject({
		_tag: "AgentSessionConflict",
		currentSessionId: registration.sessionId,
		sessionId: "session-other",
	});
});
