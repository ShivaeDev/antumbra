import { fact } from "@antumbra/platform-feature/fact.ts";
import { migration } from "@antumbra/platform-feature/migration.ts";
import { ChangeObservedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
export const changeObserved = fact("ChangeObserved", ChangeObservedPayload.fields);

export const observedFeedback = migration(1, {
	fact: changeObserved.name,
	rewrite: (stored) => Effect.succeed({ ...stored, payload: { feedback: [], ...stored.payload } }),
});
