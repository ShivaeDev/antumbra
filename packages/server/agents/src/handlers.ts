import {
	All,
	Authority,
	ById,
	ByPiece,
	BySession,
	ByVoyage,
	CanRetireCrew,
	Captain,
	CaptainReading,
	Reading,
	Roster,
	Smoother,
} from "@antumbra/server-agents/contract/reading.ts";
import { Admitted, BirthBySession, Births, Dispatch, Pending, PendingOperations, Rest, WorkingCount } from "@antumbra/server-agents/contract/work.ts";
import { AgentsContract } from "@antumbra/server-agents/contract.ts";
import { readKeys } from "@shivaedev/changes/keys.ts";
import { Effect, Layer } from "effect";
import { stream } from "effect/reactivity/Reactivity";
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
			"agents.canRetireCrew": (input) => stream(readKeys(CanRetireCrew.reads(input)))(service.canRetireCrew(input).pipe(Effect.orDie)),
			"agents.smoother": (input) => stream(readKeys(Smoother.reads(input)))(service.smoother(input).pipe(Effect.orDie)),
			"agents.captainReading": (input) => stream(readKeys(CaptainReading.reads(input)))(service.captainReading(input).pipe(Effect.orDie)),
			"agents.byVoyage": (input) => stream(readKeys(ByVoyage.reads(input)))(service.byVoyage(input).pipe(Effect.orDie)),
			"agents.byPiece": (input) => stream(readKeys(ByPiece.reads(input)))(service.byPiece(input).pipe(Effect.orDie)),
			"agents.rest": (input) => stream(readKeys(Rest.reads(input)))(service.rest(input).pipe(Effect.orDie)),
			"agents.roster": (input) => stream(readKeys(Roster.reads(input)))(service.roster(input).pipe(Effect.orDie)),
			"agents.reading": (input) => stream(readKeys(Reading.reads(input)))(service.reading(input).pipe(Effect.orDie)),
			"agents.bySession": (input) => stream(readKeys(BySession.reads(input)))(service.bySession(input).pipe(Effect.orDie)),
			"agents.workingCount": (input) => stream(readKeys(WorkingCount.reads(input)))(service.workingCount(input).pipe(Effect.orDie)),
			"agents.all": (input) => stream(readKeys(All.reads(input)))(service.all(input).pipe(Effect.orDie)),
			"agents.byId": (input) => stream(readKeys(ById.reads(input)))(service.byId(input).pipe(Effect.orDie)),
			"agents.captain": (input) => stream(readKeys(Captain.reads(input)))(service.captain(input).pipe(Effect.orDie)),
			"agents.authority": (input) => stream(readKeys(Authority.reads(input)))(service.authority(input).pipe(Effect.orDie)),
			"agents.births": (input) => stream(readKeys(Births.reads(input)))(service.births(input).pipe(Effect.orDie)),
			"agents.birthBySession": (input) => stream(readKeys(BirthBySession.reads(input)))(service.birthBySession(input).pipe(Effect.orDie)),
			"agents.dispatch": (input) => stream(readKeys(Dispatch.reads(input)))(service.dispatch(input).pipe(Effect.orDie)),
			"agents.pending": (input) => stream(readKeys(Pending.reads(input)))(service.pending(input).pipe(Effect.orDie)),
			"agents.pendingOperations": (input) => stream(readKeys(PendingOperations.reads(input)))(service.pendingOperations(input).pipe(Effect.orDie)),
			"agents.admitted": (input) => stream(readKeys(Admitted.reads(input)))(service.admitted(input).pipe(Effect.orDie)),
		});
	}),
);
export const agents = handlers.pipe(Layer.provideMerge(Agents.layer));
