import { Boards } from "@antumbra/boards";
import { holding, SettingsSource } from "@antumbra/contract";
import { IntentDemandPassFailed, type IntentDemandRegistration } from "@antumbra/intent-demand";
import { mailWords } from "@antumbra/prompts";
import { Cause, Effect } from "effect";
import { KernelReach } from "#kernel-reach.ts";
import { makeDueWakes } from "#mail-due-wakes.ts";

export const MAIL_DELIVERY_TAG = "session/mail-delivery";

export const makeMailDelivery = Effect.gen(function* () {
	const boards = yield* Boards;
	const dueWakes = yield* makeDueWakes;
	const reach = yield* KernelReach;
	const settings = yield* SettingsSource;
	return Effect.gen(function* () {
		const { settings: chosen } = yield* settings.current;
		if (holding(chosen, "wake")) {
			return;
		}
		for (const due of yield* dueWakes()) {
			if (yield* reach.wakePending(due.sessionId)) {
				continue;
			}
			yield* reach.rouseSession({ message: mailWords(due.batch), sessionId: due.sessionId });
			// Stamping after the wake is accepted leaves refused mail due on the next pass.
			yield* boards.markDelivered(due.agentId, due.unreadIds);
		}
	});
});

export const compileMailDeliveryDemands = (deliver: Effect.Effect<void, unknown>): ReadonlyArray<IntentDemandRegistration> => [
	{
		pass: deliver.pipe(
			Effect.catchCause((cause) => Effect.fail(new IntentDemandPassFailed({ detail: Cause.pretty(cause), tag: MAIL_DELIVERY_TAG }))),
		),
		tag: MAIL_DELIVERY_TAG,
	},
];
