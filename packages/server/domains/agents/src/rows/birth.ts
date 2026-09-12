import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { AgentId, BirthId } from "#ids.ts";

export const birth = row(
	"birth",
	{
		id: BirthId,
		operationRequestId: Schema.String,
		createsAgent: Schema.Boolean,
		cwd: Schema.NullOr(Schema.String),
		source: Schema.Literals(["dispatch", "work-now", "direct"]),
		agentId: AgentId,
		sessionId: SessionId,
		voyageId: Schema.NullOr(VoyageId),
		pieceId: Schema.NullOr(PieceId),
		backend: Schema.NullOr(Schema.String),
		model: Schema.NullOr(Schema.String),
		effort: Schema.NullOr(Schema.String),
		role: Schema.String,
		status: Schema.Literals(["requested", "admitted", "running", "waiting", "ended", "cancelled"]),
		detail: Schema.NullOr(Schema.String),
		requestedAt: Schema.String,
		admittedAt: Schema.NullOr(Schema.String),
	},
	{ key: "id" },
);
