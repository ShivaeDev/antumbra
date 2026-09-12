import { fact } from "@antumbra/platform-feature/fact.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { Schema } from "effect";
import { DeliveryStatus } from "#schema.ts";
export const inputDeliveryChanged = fact("InputDeliveryChanged", {
	id: SessionInputId,
	status: DeliveryStatus,
	detail: Schema.NullOr(Schema.String),
});
