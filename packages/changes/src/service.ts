import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { defineService } from "@antumbra/service-definition";
import { Effect } from "effect";
import { dismissChange } from "#dismiss.ts";
import { forPieces } from "#for-pieces.ts";
import { ChangeHostRegistry, RunnerRegistry } from "#registries.ts";
import { readChangeSnapshot } from "#snapshot.ts";
import { adoptSubmittedChange } from "#submissions/adopt.ts";
import { readHeldResources } from "#submissions/held-resources.ts";
import { observedChanges } from "#submissions/observed.ts";
import { openSubmittedChange } from "#submissions/open.ts";
import { refreshSubmittedChanges } from "#submissions/refresh.ts";
import { submitChange } from "#submissions/submit.ts";
import { watchableChanges } from "#submissions/watchable.ts";

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
