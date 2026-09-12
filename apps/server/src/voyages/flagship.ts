import { open } from "@antumbra/domain-voyages/commands/open.ts";
import { FLAGSHIP_REQUEST } from "@antumbra/domain-voyages/ids.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Effect } from "effect";

const flagship = {
	captainBackend: null,
	captainEffort: null,
	captainModel: null,
	context: "Fleet-level rulings and findings belong here.",
	crewBackend: null,
	crewEffort: null,
	crewModel: null,
	kind: "flagship",
	name: "Flagship",
	northStar: "The fleet sails well.",
	requestId: FLAGSHIP_REQUEST,
} as const;

export const openFlagship = Effect.gen(function* () {
	const commit = yield* Commit;
	yield* commit.commit(open, flagship).pipe(
		Effect.catchTag("AlreadyDone", () => Effect.void),
		Effect.orDie,
	);
});
