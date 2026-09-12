import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { SessionId } from "#ids.ts";
export const sessionGap = row(
	"sessionGap",
	{ id: Schema.String, sessionId: SessionId, kind: Schema.String, detail: Schema.String, observedAt: Schema.String },
	{ key: "id", scope: "sessionId" },
);
