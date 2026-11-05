import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { ChangePublicationFailedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const publicationFailed = fact("ChangePublicationFailed", ChangePublicationFailedPayload.fields);
export const publicationFailedMaterializer = Effect.fn("changes.publicationFailed")(function* (
	fact: FactValue<typeof publicationFailed>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	if (fact.change !== null) yield* rows.change.updateVoid({ ...fact.change, id: fact.change.id }).pipe(Effect.orDie);
});
