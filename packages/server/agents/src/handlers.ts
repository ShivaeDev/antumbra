import { AgentsContract } from "@antumbra/server-agents/contract.ts";
import { Effect, Layer } from "effect";
import {
	unexpectedAdmit,
	unexpectedCancel,
	unexpectedDelay,
	unexpectedHail,
	unexpectedHold,
	unexpectedRequest,
	unexpectedRetire,
	unexpectedRetireCrew,
	unexpectedRetry,
	unexpectedSmooth,
	unexpectedSpawn,
	unexpectedWorkNow,
} from "#failures.ts";
import { Agents } from "#service.ts";
export const handlers = AgentsContract.application.toLayer(
	Effect.gen(function* () {
		const service = yield* Agents;
		return AgentsContract.application.of({
			"agents.retireCrew": (input) => service.retireCrew(input).pipe(Effect.catchIf(unexpectedRetireCrew, Effect.die)),
			"agents.retire": (input) => service.retire(input).pipe(Effect.catchIf(unexpectedRetire, Effect.die)),
			"agents.spawn": (input) => service.spawn(input).pipe(Effect.catchIf(unexpectedSpawn, Effect.die)),
			"agents.hail": (input) => service.hail(input).pipe(Effect.catchIf(unexpectedHail, Effect.die)),
			"agents.workNow": (input) => service.workNow(input).pipe(Effect.catchIf(unexpectedWorkNow, Effect.die)),
			"agents.request": (input) => service.request(input).pipe(Effect.catchIf(unexpectedRequest, Effect.die)),
			"agents.admit": (input) => service.admit(input).pipe(Effect.catchIf(unexpectedAdmit, Effect.die)),
			"agents.hold": (input) => service.hold(input).pipe(Effect.catchIf(unexpectedHold, Effect.die)),
			"agents.delay": (input) => service.delay(input).pipe(Effect.catchIf(unexpectedDelay, Effect.die)),
			"agents.cancel": (input) => service.cancel(input).pipe(Effect.catchIf(unexpectedCancel, Effect.die)),
			"agents.retry": (input) => service.retry(input).pipe(Effect.catchIf(unexpectedRetry, Effect.die)),
			"agents.smooth": (input) => service.smooth(input).pipe(Effect.catchIf(unexpectedSmooth, Effect.die)),
			"agents.canRetireCrew": (input) => service.canRetireCrew(input).pipe(Effect.orDie),
			"agents.smoother": (input) => service.smoother(input).pipe(Effect.orDie),
			"agents.captainReading": (input) => service.captainReading(input).pipe(Effect.orDie),
			"agents.byVoyage": (input) => service.byVoyage(input).pipe(Effect.orDie),
			"agents.byPiece": (input) => service.byPiece(input).pipe(Effect.orDie),
			"agents.rest": (input) => service.rest(input).pipe(Effect.orDie),
			"agents.roster": (input) => service.roster(input).pipe(Effect.orDie),
			"agents.reading": (input) => service.reading(input).pipe(Effect.orDie),
			"agents.bySession": (input) => service.bySession(input).pipe(Effect.orDie),
			"agents.workingCount": (input) => service.workingCount(input).pipe(Effect.orDie),
			"agents.all": (input) => service.all(input).pipe(Effect.orDie),
			"agents.byId": (input) => service.byId(input).pipe(Effect.orDie),
			"agents.captain": (input) => service.captain(input).pipe(Effect.orDie),
			"agents.authority": (input) => service.authority(input).pipe(Effect.orDie),
			"agents.births": (input) => service.births(input).pipe(Effect.orDie),
			"agents.birthBySession": (input) => service.birthBySession(input).pipe(Effect.orDie),
			"agents.dispatch": (input) => service.dispatch(input).pipe(Effect.orDie),
			"agents.pending": (input) => service.pending(input).pipe(Effect.orDie),
			"agents.pendingOperations": (input) => service.pendingOperations(input).pipe(Effect.orDie),
			"agents.admitted": (input) => service.admitted(input).pipe(Effect.orDie),
		});
	}),
);
export const agents = handlers.pipe(Layer.provideMerge(Agents.layer));
