import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Schema } from "effect";
import { crewRetired } from "#facts/crew-retired.ts";
import { pieceAgent } from "#rows/piece-agent.ts";
export const retireCrew = command("retireCrew", {
	input: { pieceId: PieceId },
	reads: [pieceAgent, session],
	emits: crewRetired,
	rejections: { Working: { agentId: Schema.String, sessionId: Schema.String } },
});
