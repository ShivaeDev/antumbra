import { Authority, AwaitingAscent, AwaitingDelivery, Delivery, OpenGates } from "@antumbra/server-rulings/contract/delivery.ts";
import { Binding, ById, Choices, Display, Frontier, Open, Replacements, Standing } from "@antumbra/server-rulings/contract/reading.ts";
import { RulingsContract } from "@antumbra/server-rulings/contract.ts";
import { readKeys } from "@shivaedev/changes/keys.ts";
import { Effect, Layer } from "effect";
import { stream } from "effect/reactivity/Reactivity";
import {
	unexpectedAcknowledgeNotice,
	unexpectedAddContext,
	unexpectedAnswer,
	unexpectedGate,
	unexpectedMarkDelivered,
	unexpectedPark,
	unexpectedPassUp,
	unexpectedProclaim,
	unexpectedReclassify,
	unexpectedRequest,
	unexpectedSupersede,
	unexpectedWithdraw,
} from "#failures.ts";
import { Rulings } from "#service.ts";
export const handlers = RulingsContract.application.toLayer(
	Effect.gen(function* () {
		const service = yield* Rulings;
		return RulingsContract.application.of({
			"rulings.acknowledgeNotice": (input) => service.acknowledgeNotice(input).pipe(Effect.catchIf(unexpectedAcknowledgeNotice, Effect.die)),
			"rulings.addContext": (input) => service.addContext(input).pipe(Effect.catchIf(unexpectedAddContext, Effect.die)),
			"rulings.answer": (input) => service.answer(input).pipe(Effect.catchIf(unexpectedAnswer, Effect.die)),
			"rulings.gate": (input) => service.gate(input).pipe(Effect.catchIf(unexpectedGate, Effect.die)),
			"rulings.markDelivered": (input) => service.markDelivered(input).pipe(Effect.catchIf(unexpectedMarkDelivered, Effect.die)),
			"rulings.park": (input) => service.park(input).pipe(Effect.catchIf(unexpectedPark, Effect.die)),
			"rulings.passUp": (input) => service.passUp(input).pipe(Effect.catchIf(unexpectedPassUp, Effect.die)),
			"rulings.proclaim": (input) => service.proclaim(input).pipe(Effect.catchIf(unexpectedProclaim, Effect.die)),
			"rulings.reclassify": (input) => service.reclassify(input).pipe(Effect.catchIf(unexpectedReclassify, Effect.die)),
			"rulings.request": (input) => service.request(input).pipe(Effect.catchIf(unexpectedRequest, Effect.die)),
			"rulings.supersede": (input) => service.supersede(input).pipe(Effect.catchIf(unexpectedSupersede, Effect.die)),
			"rulings.withdraw": (input) => service.withdraw(input).pipe(Effect.catchIf(unexpectedWithdraw, Effect.die)),
			"rulings.delivery": (input) => stream(readKeys(Delivery.reads(input)))(service.delivery(input).pipe(Effect.orDie)),
			"rulings.authority": (input) => stream(readKeys(Authority.reads(input)))(service.authority(input).pipe(Effect.orDie)),
			"rulings.choices": (input) => stream(readKeys(Choices.reads(input)))(service.choices(input).pipe(Effect.orDie)),
			"rulings.replacements": (input) => stream(readKeys(Replacements.reads(input)))(service.replacements(input).pipe(Effect.orDie)),
			"rulings.display": (input) => stream(readKeys(Display.reads(input)))(service.display(input).pipe(Effect.orDie)),
			"rulings.awaitingAscent": (input) => stream(readKeys(AwaitingAscent.reads(input)))(service.awaitingAscent(input).pipe(Effect.orDie)),
			"rulings.awaitingDelivery": (input) => stream(readKeys(AwaitingDelivery.reads(input)))(service.awaitingDelivery(input).pipe(Effect.orDie)),
			"rulings.binding": (input) => stream(readKeys(Binding.reads(input)))(service.binding(input).pipe(Effect.orDie)),
			"rulings.byId": (input) => stream(readKeys(ById.reads(input)))(service.byId(input).pipe(Effect.orDie)),
			"rulings.frontier": (input) => stream(readKeys(Frontier.reads(input)))(service.frontier(input).pipe(Effect.orDie)),
			"rulings.openGates": (input) => stream(readKeys(OpenGates.reads(input)))(service.openGates(input).pipe(Effect.orDie)),
			"rulings.open": (input) => stream(readKeys(Open.reads(input)))(service.open(input).pipe(Effect.orDie)),
			"rulings.standing": (input) => stream(readKeys(Standing.reads(input)))(service.standing(input).pipe(Effect.orDie)),
		});
	}),
);
export const rulings = handlers.pipe(Layer.provideMerge(Rulings.layer));
