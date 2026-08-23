import { ChangeView } from "#change-views.ts";
import { QuayView } from "#quay-views.ts";
import { type AppProcedure, surface } from "#router-procedure.ts";
import { AdoptChangeRequest, DismissChangeRequest } from "#voyage-requests.ts";
import { VoyageSource } from "#voyages.ts";

export const quayRoutes = (procedure: AppProcedure) => ({
	adoptChange: procedure
		.input(AdoptChangeRequest)
		.output(ChangeView)
		.mutation(function* (input) {
			const voyages = yield* VoyageSource;
			return yield* surface(voyages.adoptChange(input));
		}),
	// why: the terminal verb for a change that died at its host — the quay is
	// where it waits, so the quay is where it is answered.
	dismissChange: procedure
		.input(DismissChangeRequest)
		.mutation(function* (input) {
			const voyages = yield* VoyageSource;
			yield* surface(voyages.dismissChange(input.changeId));
		}),
	quay: procedure.output(QuayView).query(function* () {
		const voyages = yield* VoyageSource;
		return yield* surface(voyages.quay);
	}),
	quayFeed: procedure.output(QuayView).subscription(function* () {
		const voyages = yield* VoyageSource;
		return voyages.quayFeed;
	}),
	refreshChanges: procedure.mutation(function* () {
		const voyages = yield* VoyageSource;
		yield* surface(voyages.refreshChanges);
	}),
});
