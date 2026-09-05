import { BackendCapacities } from "@antumbra/provider-capacity";
import { waitFor } from "@antumbra/sessions";
import { Effect } from "effect";
import { capacityHoldDetail } from "#backend-capacity-hold.ts";

export const makeCapacityAdmission = Effect.gen(function* () {
	const capacities = yield* BackendCapacities;
	const admit = Effect.fn("CapacityAdmission.admit")(function* (backend: string) {
		const capacity = yield* capacities.current(backend);
		if (capacity.status === "blocked") {
			yield* waitFor(capacityHoldDetail(backend, capacity.detail));
		}
	});
	return { current: capacities.current, admit };
});
export type CapacityAdmission = Effect.Success<typeof makeCapacityAdmission>;
