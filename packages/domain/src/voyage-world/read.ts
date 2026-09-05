import { Database } from "@antumbra/persistence";
import { Repos } from "@antumbra/repos";
import { Rulings } from "@antumbra/rulings";
import { Effect } from "effect";
import { read as readExecution } from "#execution/read.ts";
import { byId } from "#voyage-row-projection.ts";
import type { VoyageWorld } from "#voyage-rows.ts";

export const read = Effect.fn("VoyageWorldSource.read")(function* () {
	const db = yield* Database;
	const rulings = yield* Rulings;
	const repos = yield* Repos;
	return {
		...(yield* readExecution()),
		crews: yield* db.VoyageAgent.all(),
		openRulings: yield* rulings.open(),
		reports: byId(yield* db.Report.all()),
		repos: byId(yield* repos.registered()),
	} satisfies VoyageWorld;
});

export type VoyageWorldReadFailure = Effect.Error<ReturnType<typeof read>>;
