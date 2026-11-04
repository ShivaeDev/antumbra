import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { Effect } from "effect";
import { acknowledgeNotice } from "#commands/acknowledge-notice.ts";
import { addContext } from "#commands/add-context.ts";
import { answer } from "#commands/answer.ts";
import { gate } from "#commands/gate.ts";
import { markDelivered } from "#commands/mark-delivered.ts";
import { park } from "#commands/park.ts";
import { passUp } from "#commands/pass-up.ts";
import { proclaim } from "#commands/proclaim.ts";
import { reclassify } from "#commands/reclassify.ts";
import { request } from "#commands/request.ts";
import { supersede } from "#commands/supersede.ts";
import { withdraw } from "#commands/withdraw.ts";
import { authority } from "#queries/authority.ts";
import { awaitingAscent } from "#queries/awaiting-ascent.ts";
import { awaitingDelivery } from "#queries/awaiting-delivery.ts";
import { binding } from "#queries/binding.ts";
import { byId } from "#queries/by-id.ts";
import { choices } from "#queries/choices.ts";
import { delivery } from "#queries/delivery.ts";
import { display } from "#queries/display.ts";
import { frontier } from "#queries/frontier.ts";
import { open } from "#queries/open.ts";
import { openGates } from "#queries/open-gates.ts";
import { replacements } from "#queries/replacements.ts";
import { standing } from "#queries/standing.ts";
export const Rulings = defineService({
	id: "@antumbra/server-rulings/Rulings",
	requires: [ExecutionHistory],
	initialize: Effect.void,
	methods: () => ({
		acknowledgeNotice,
		addContext,
		answer,
		gate,
		markDelivered,
		park,
		passUp,
		proclaim,
		reclassify,
		request,
		supersede,
		withdraw,
		delivery,
		authority,
		choices,
		replacements,
		display,
		awaitingAscent,
		awaitingDelivery,
		binding,
		byId,
		frontier,
		openGates,
		open,
		standing,
	}),
});
