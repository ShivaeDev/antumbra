import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { defineService } from "@antumbra/service-definition";
import { Effect } from "effect";
import { changeById } from "#by-id.ts";
import { dismissChange } from "#dismiss.ts";
import { forPieces } from "#for-pieces.ts";
import { hostCapabilities } from "#host-capabilities.ts";
import { hostTags } from "#host-tags.ts";
import { pendingForPieces } from "#pending-for-pieces.ts";
import { ChangeHostRegistry, RunnerRegistry } from "#registries.ts";
import { situationsForPieces } from "#situations/for-pieces.ts";
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
		byId: changeById,
		dismiss: dismissChange,
		forPieces,
		situationsForPieces,
		heldResources: readHeldResources,
		hostCapabilities,
		hostTags,
		observed: observedChanges,
		open: openSubmittedChange,
		pendingForPieces,
		refresh: refreshSubmittedChanges,
		snapshot: readChangeSnapshot,
		submit: submitChange,
		watchable: watchableChanges,
	}),
	requires: [Database, DomainFeeds, Pieces, ChangeHostRegistry, RunnerRegistry],
});
