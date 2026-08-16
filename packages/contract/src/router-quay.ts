import { QuayView } from "#quay-views.ts";
import { type AppProcedure, surface } from "#router-procedure.ts";
import { ChangeView } from "#voyage-views.ts";
import { AdoptChangeRequest, VoyageSource } from "#voyages.ts";

export const quayRoutes = (procedure: AppProcedure) => ({
	adoptChange: procedure
		.input(AdoptChangeRequest)
		.output(ChangeView)
		.mutation(function* (input) {
			const voyages = yield* VoyageSource;
			return yield* surface(voyages.adoptChange(input));
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
