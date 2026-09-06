import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import { rawOf, type ScriptedBackend } from "#test/harness.ts";
import { untilTerminal } from "#test/session-recovery-fixture.ts";

export const spawnRequest = {
	backend: "scripted",
	charter: "chart the reef",
	role: "navigator",
};

export const note = (n: number): AgentEvent => ({
	raw: rawOf("assistant"),
	role: "agent",
	text: `note ${n}`,
	type: "message",
});

export const liveSession = (scripted: ScriptedBackend, sessionId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const kernel = yield* Kernel;
		const births = yield* db.Intent.where({ tag: "agent/spawn" }).all();
		expect(births).toHaveLength(1);
		const birth = Option.getOrThrow(Option.fromUndefinedOr(births[0]));
		expect(yield* untilTerminal(kernel.changes(birth.id))).toBe("succeeded");
		return Option.getOrThrow(Option.fromUndefinedOr(yield* scripted.session(sessionId)));
	});
