import { IntentDemandPassFailed, type IntentDemandRegistration } from "@antumbra/intent-demand";
import { Cause, Effect } from "effect";
import { MailDelivery } from "#mail-delivery/service.ts";

export const MAIL_DELIVERY_TAG = "session/mail-delivery";

export const mailDeliveryDemands = Effect.gen(function* () {
	const mail = yield* MailDelivery;
	return [
		{
			pass: mail
				.deliver()
				.pipe(Effect.catchCause((cause) => Effect.fail(new IntentDemandPassFailed({ detail: Cause.pretty(cause), tag: MAIL_DELIVERY_TAG })))),
			tag: MAIL_DELIVERY_TAG,
		},
	] satisfies ReadonlyArray<IntentDemandRegistration>;
});
