import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { SessionId } from "#ids.ts";
export const sessionStartResult = row(
	"sessionStartResult",
	{ requestId: Schema.String, sessionId: SessionId, status: Schema.Literals(["started", "failed"]), reason: Schema.NullOr(Schema.String) },
	{ key: "requestId" },
);
