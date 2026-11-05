import type { VoyageId } from "@antumbra/platform-vocabulary/voyage.ts";
import { VoyageHistory } from "@antumbra/server-storage/voyages/service.ts";
import { Effect } from "effect";

export const byId = Effect.fn("Voyages.byId")(function* ({ id }: { readonly id: VoyageId }) {
	return yield* (yield* VoyageHistory).byId(id);
});

export const list = Effect.fn("Voyages.list")(function* () {
	return yield* (yield* VoyageHistory).list();
});

export const progress = Effect.fn("Voyages.progress")(function* ({ id }: { readonly id: VoyageId }) {
	return yield* (yield* VoyageHistory).progress(id);
});
