import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { ToolSet } from "@antumbra/platform-runner/tools.ts";
import { Schema } from "effect";
import { StartId } from "#ids.ts";

export const start = row(
	"start",
	{
		id: StartId,
		operationRequestId: Schema.String,
		source: Schema.Literals(["dispatch", "work-now", "direct"]),
		agentId: AgentId,
		sessionId: SessionId,
		voyageId: Schema.NullOr(VoyageId),
		pieceId: Schema.NullOr(PieceId),
		backend: Schema.String,
		model: Schema.NullOr(Schema.String),
		effort: Schema.NullOr(Schema.String),
		role: Schema.String,
		charter: Schema.String,
		toolSetVersion: Schema.String,
		tools: ToolSet.fields.tools,
		status: Schema.Literals(["requested", "admitted", "running", "waiting", "ended", "cancelled"]),
		detail: Schema.NullOr(Schema.String),
		requestedAt: Schema.String,
		admittedAt: Schema.NullOr(Schema.String),
	},
	{ key: "id" },
);
