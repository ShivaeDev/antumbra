import { ChangesContract } from "@antumbra/server-changes/contract.ts";

import { Effect, Layer } from "effect";
import {
	unexpectedAdopt,
	unexpectedArchive,
	unexpectedDismiss,
	unexpectedFailAdoption,
	unexpectedFailPublication,
	unexpectedForwardFeedback,
	unexpectedFreeze,
	unexpectedObserve,
	unexpectedObserveHostCapability,
	unexpectedPrepare,
	unexpectedRefresh,
	unexpectedRequestAdoption,
	unexpectedRetryAdoption,
} from "#failures.ts";
import { Changes } from "#service.ts";
export const handlers = ChangesContract.application.toLayer(
	Effect.gen(function* () {
		const service = yield* Changes;
		return ChangesContract.application.of({
			"changes.cleanupCandidates": () => service.cleanupCandidates().pipe(Effect.orDie),
			"changes.failAdoption": (input) => service.failAdoption(input).pipe(Effect.catchIf(unexpectedFailAdoption, Effect.die)),
			"changes.retryAdoption": (input) => service.retryAdoption(input).pipe(Effect.catchIf(unexpectedRetryAdoption, Effect.die)),
			"changes.observeHostCapability": (input) =>
				service.observeHostCapability(input).pipe(Effect.catchIf(unexpectedObserveHostCapability, Effect.die)),
			"changes.failPublication": (input) => service.failPublication(input).pipe(Effect.catchIf(unexpectedFailPublication, Effect.die)),
			"changes.refresh": (input) => service.refresh(input).pipe(Effect.catchIf(unexpectedRefresh, Effect.die)),
			"changes.requestAdoption": (input) => service.requestAdoption(input).pipe(Effect.catchIf(unexpectedRequestAdoption, Effect.die)),
			"changes.prepare": (input) => service.prepare(input).pipe(Effect.catchIf(unexpectedPrepare, Effect.die)),
			"changes.freeze": (input) => service.freeze(input).pipe(Effect.catchIf(unexpectedFreeze, Effect.die)),
			"changes.observe": (input) => service.observe(input).pipe(Effect.catchIf(unexpectedObserve, Effect.die)),
			"changes.adopt": (input) => service.adopt(input).pipe(Effect.catchIf(unexpectedAdopt, Effect.die)),
			"changes.archive": (input) => service.archive(input).pipe(Effect.catchIf(unexpectedArchive, Effect.die)),
			"changes.dismiss": (input) => service.dismiss(input).pipe(Effect.catchIf(unexpectedDismiss, Effect.die)),
			"changes.forwardFeedback": (input) => service.forwardFeedback(input).pipe(Effect.catchIf(unexpectedForwardFeedback, Effect.die)),
			"changes.byPiece": (input) => service.byPiece(input).pipe(Effect.orDie),
			"changes.hostCapabilities": (input) => service.hostCapabilities(input).pipe(Effect.orDie),
			"changes.browse": (input) => service.browse(input).pipe(Effect.orDie),
			"changes.sessionSituations": (input) => service.sessionSituations(input).pipe(Effect.orDie),
			"changes.adoptions": (input) => service.adoptions(input).pipe(Effect.orDie),
			"changes.world": (input) => service.world(input).pipe(Effect.orDie),
			"changes.quay": (input) => service.quay(input).pipe(Effect.orDie),
			"changes.all": (input) => service.all(input).pipe(Effect.orDie),
			"changes.links": (input) => service.links(input).pipe(Effect.orDie),
			"changes.watchable": (input) => service.watchable(input).pipe(Effect.orDie),
			"changes.publishing": (input) => service.publishing(input).pipe(Effect.orDie),
			"changes.archivable": (input) => service.archivable(input).pipe(Effect.orDie),
		});
	}),
);
export const changes = handlers.pipe(Layer.provideMerge(Changes.layer));
