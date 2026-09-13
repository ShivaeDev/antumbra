import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { SessionId } from "#ids.ts";

export const sessionOpening = row(
	"sessionOpening",
	{
		id: SessionId,
		inputId: Schema.String,
		standingOrders: Schema.NullOr(Schema.String),
		charter: Schema.String,
		sequence: Schema.Number,
	},
	{ key: "id" },
);
