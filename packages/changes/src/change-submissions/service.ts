import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { defineService } from "@antumbra/service-definition";
import { Effect } from "effect";
import { adoptSubmittedChange } from "#change-submissions/adopt.ts";
import { readHeldResources } from "#change-submissions/held-resources.ts";
import { observedChanges } from "#change-submissions/observed.ts";
import { openSubmittedChange } from "#change-submissions/open.ts";
import { refreshSubmittedChanges } from "#change-submissions/refresh.ts";
import { ChangeHostRegistry, RunnerRegistry } from "#change-submissions/registries.ts";
import { submitChange } from "#change-submissions/submit.ts";
import { watchableChanges } from "#change-submissions/watchable.ts";
import { dismissChange } from "#dismiss.ts";
import { forPieces } from "#for-pieces.ts";
import { readChangeSnapshot } from "#snapshot.ts";

export const Changes = defineService({
	id: "@antumbra/changes/Changes",
	initialize: Effect.void,
	methods: () => ({
		adopt: adoptSubmittedChange,
		dismiss: dismissChange,
		forPieces,
		heldResources: readHeldResources,
		observed: observedChanges,
		open: openSubmittedChange,
		refresh: refreshSubmittedChanges,
		snapshot: readChangeSnapshot,
		submit: submitChange,
		watchable: watchableChanges,
	}),
	requires: [Database, DomainFeeds, Pieces, ChangeHostRegistry, RunnerRegistry],
});
