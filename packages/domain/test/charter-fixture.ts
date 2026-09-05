import { Database } from "@antumbra/persistence";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import type { ScriptedBackend } from "#test/harness.ts";

export const deliveredCharter = (scripted: ScriptedBackend, pieceId: string) =>
	Effect.gen(function* () {
		const { sessionId, input } = yield* scripted.queued;
		const db = yield* Database;
		const session = Option.getOrThrow(yield* db.AgentSession.where({ id: sessionId }).first());
		expect(yield* db.PieceAgent.where({ agentId: session.agentId, pieceId }).count()).toBe(1);
		return {
			agentId: session.agentId,
			text: input.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n"),
		};
	});
