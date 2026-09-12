import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { DeliveryStatus, Prepared } from "#schema.ts";
export const sessionInput = row(
	"sessionInput",
	{ ...Prepared.fields, status: DeliveryStatus, detail: Schema.NullOr(Schema.String), createdAt: Schema.Number },
	{ key: "id", scope: "sessionId" },
);
