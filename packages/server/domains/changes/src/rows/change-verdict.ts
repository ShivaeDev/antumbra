import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { ChangeId } from "#ids.ts";
export const changeVerdict = row(
	"changeVerdict",
	{ changeId: ChangeId, verdict: Schema.Literal("dismissed"), landedAt: Schema.String },
	{ key: "changeId" },
);
