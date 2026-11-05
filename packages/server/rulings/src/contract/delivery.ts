import { authority as sourceAuthority } from "@antumbra/domain-rulings/queries/authority.ts";
import { awaitingAscent as sourceAwaitingAscent } from "@antumbra/domain-rulings/queries/awaiting-ascent.ts";
import { awaitingDelivery as sourceAwaitingDelivery } from "@antumbra/domain-rulings/queries/awaiting-delivery.ts";
import { delivery as sourceDelivery } from "@antumbra/domain-rulings/queries/delivery.ts";
import { openGates as sourceOpenGates } from "@antumbra/domain-rulings/queries/open-gates.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { stream } from "@shivaedev/contract/operation.ts";
import { Schema } from "effect";
export const Delivery = stream("delivery", {
	payload: sourceDelivery.input,
	success: sourceDelivery.output,
	reads: () => [
		collection("ruling", Schema.String).list,
		collection("rulingNoticeReceipt", Schema.String).list,
		collection("message", Schema.String).list,
		collection("session", Schema.String).list,
		collection("sessionToolCall", Schema.String).list,
		collection("voyage", Schema.String).list,
		collection("voyageAgent", Schema.String).list,
		collection("captainReading", Schema.String).list,
	],
});
export const Authority = stream("authority", {
	payload: sourceAuthority.input,
	success: sourceAuthority.output,
	reads: () => [collection("voyageAgent", Schema.String).list, collection("voyage", Schema.String).list],
});
export const AwaitingAscent = stream("awaitingAscent", {
	payload: sourceAwaitingAscent.input,
	success: sourceAwaitingAscent.output,
	reads: () => [collection("ruling", Schema.String).list],
});
export const AwaitingDelivery = stream("awaitingDelivery", {
	payload: sourceAwaitingDelivery.input,
	success: sourceAwaitingDelivery.output,
	reads: () => [collection("ruling", Schema.String).list],
});
export const OpenGates = stream("openGates", {
	payload: sourceOpenGates.input,
	success: sourceOpenGates.output,
	reads: () => [collection("rulingGate", Schema.String).list],
});
