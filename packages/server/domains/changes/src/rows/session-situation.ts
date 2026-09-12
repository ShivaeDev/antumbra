import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { ChangeSituation } from "@antumbra/platform-vocabulary/change.ts";
import { Schema } from "effect";
import { ChangeId } from "#ids.ts";

export const sessionSituation = row(
	"sessionSituation",
	{ id: Schema.String, sessionId: SessionId, changeId: ChangeId, reference: Schema.String, situation: ChangeSituation, text: Schema.String },
	{ key: "id", scope: "sessionId" },
);
