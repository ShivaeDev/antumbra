import { Effect, Layer } from "effect";
import { RulingsContract } from "#contract.ts";
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
			"rulings.delivery": (input) => service.delivery(input).pipe(Effect.orDie),
			"rulings.authority": (input) => service.authority(input).pipe(Effect.orDie),
			"rulings.choices": (input) => service.choices(input).pipe(Effect.orDie),
			"rulings.replacements": (input) => service.replacements(input).pipe(Effect.orDie),
			"rulings.display": (input) => service.display(input).pipe(Effect.orDie),
			"rulings.awaitingAscent": (input) => service.awaitingAscent(input).pipe(Effect.orDie),
			"rulings.awaitingDelivery": (input) => service.awaitingDelivery(input).pipe(Effect.orDie),
			"rulings.binding": (input) => service.binding(input).pipe(Effect.orDie),
			"rulings.byId": (input) => service.byId(input).pipe(Effect.orDie),
			"rulings.frontier": (input) => service.frontier(input).pipe(Effect.orDie),
			"rulings.openGates": (input) => service.openGates(input).pipe(Effect.orDie),
			"rulings.open": (input) => service.open(input).pipe(Effect.orDie),
			"rulings.standing": (input) => service.standing(input).pipe(Effect.orDie),
		});
	}),
);
export const rulings = handlers.pipe(Layer.provideMerge(Rulings.layer));
