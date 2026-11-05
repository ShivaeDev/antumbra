import { authority as sourceAuthority } from "@antumbra/domain-rulings/queries/authority.ts";
import { awaitingAscent as sourceAwaitingAscent } from "@antumbra/domain-rulings/queries/awaiting-ascent.ts";
import { awaitingDelivery as sourceAwaitingDelivery } from "@antumbra/domain-rulings/queries/awaiting-delivery.ts";
import { delivery as sourceDelivery } from "@antumbra/domain-rulings/queries/delivery.ts";
import { openGates as sourceOpenGates } from "@antumbra/domain-rulings/queries/open-gates.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { query } from "@shivaedev/contract/operation.ts";
import { signedIn } from "@shivaedev/contract/readPolicy.ts";
import { Schema } from "effect";
export const Delivery = query("delivery", {
	readPolicy: signedIn,
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
export const Authority = query("authority", {
	readPolicy: signedIn,
	payload: sourceAuthority.input,
	success: sourceAuthority.output,
	reads: () => [collection("voyageAgent", Schema.String).list, collection("voyage", Schema.String).list],
});
export const AwaitingAscent = query("awaitingAscent", {
	readPolicy: signedIn,
	payload: sourceAwaitingAscent.input,
	success: sourceAwaitingAscent.output,
	reads: () => [collection("ruling", Schema.String).list],
});
export const AwaitingDelivery = query("awaitingDelivery", {
	readPolicy: signedIn,
	payload: sourceAwaitingDelivery.input,
	success: sourceAwaitingDelivery.output,
	reads: () => [collection("ruling", Schema.String).list],
});
export const OpenGates = query("openGates", {
	readPolicy: signedIn,
	payload: sourceOpenGates.input,
	success: sourceOpenGates.output,
	reads: () => [collection("rulingGate", Schema.String).list],
});
