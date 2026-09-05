import { BackendCapacities } from "@antumbra/provider-capacity/service";
import { Effect } from "effect";
import { capacityHoldDetail } from "#admission/hold.ts";
import { waitFor } from "#unresumable.ts";

export const admitCapacity = Effect.fn("CapacityAdmission.admit")(function* (backend: string) {
	const capacities = yield* BackendCapacities;
	const capacity = yield* capacities.current(backend);
	if (capacity.status === "blocked") {
		yield* waitFor(capacityHoldDetail(backend, capacity.detail));
	}
});
