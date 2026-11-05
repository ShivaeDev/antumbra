import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { count } from "@antumbra/domain-settings/rows/count.ts";
import { flag } from "@antumbra/domain-settings/rows/flag.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { agentReading } from "#rows/agent-reading.ts";

const Retirement = Schema.Struct({ id: agentReading.fields.id, waitUntil: Schema.NullOr(Schema.Number) });
const Siesta = Schema.Struct({ sessionId: Schema.String, idleSince: Schema.String, waitUntil: Schema.Number, held: Schema.Boolean });
const Rest = Schema.Struct({ retirements: Schema.Array(Retirement), siestas: Schema.Array(Siesta) });

export const rest = query("rest", {
	input: {},
	output: Rest,
	reads: [agentReading, pieceProgress, sessionOperation, count, flag],
});
