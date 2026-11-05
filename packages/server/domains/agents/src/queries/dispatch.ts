import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { flag } from "@antumbra/domain-settings/rows/flag.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { agent } from "#rows/agent.ts";
import { birth } from "#rows/birth.ts";
import { pieceAgent } from "#rows/piece-agent.ts";

const Target = Schema.Struct({ piece: piece.Row, voyage: voyage.Row, root: Schema.NullOr(session.Row), held: Schema.Boolean });

export const dispatch = query("dispatch", {
	input: {},
	output: Schema.Struct({ cancel: Schema.Array(birth.Row), ready: Schema.Array(Target) }),
	reads: [piece, pieceProgress, voyage, agent, pieceAgent, session, sessionOperation, birth, flag],
});
