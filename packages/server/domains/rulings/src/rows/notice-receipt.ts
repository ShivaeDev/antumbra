import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { RulingId } from "#ids.ts";
export const rulingNoticeReceipt = row(
	"rulingNoticeReceipt",
	{ id: Schema.String, rulingId: RulingId, deliveredAt: Schema.String },
	{ key: "id", scope: "rulingId" },
);
