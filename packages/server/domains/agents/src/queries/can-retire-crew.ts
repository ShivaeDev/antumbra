import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { agent } from "#rows/agent.ts";
import { pieceAgent } from "#rows/piece-agent.ts";

export const canRetireCrew = query("canRetireCrew", {
	input: { pieceId: PieceId },
	output: Schema.Boolean,
	reads: [pieceProgress, agent, pieceAgent, session],
});
