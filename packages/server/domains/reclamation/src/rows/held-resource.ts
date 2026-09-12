import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { BerthId, HeldResourceId } from "#ids.ts";

export const heldResource = row(
	"heldResource",
	{
		id: HeldResourceId,
		berthId: BerthId,
		changeId: Schema.String,
	},
	{ key: "id", scope: "berthId" },
);
