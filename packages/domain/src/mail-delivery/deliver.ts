import { Boards } from "@antumbra/boards";
import { holding, SettingsSource } from "@antumbra/contract";
import { mailWords } from "@antumbra/prompts";
import { Effect } from "effect";
import { KernelReach } from "#kernel-reach/service.ts";
import { dueWakes } from "#mail-delivery/due-wakes.ts";

export const deliver = Effect.fn("MailDelivery.deliver")(function* () {
	const boards = yield* Boards;
	const reach = yield* KernelReach;
	const settings = yield* SettingsSource;
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
