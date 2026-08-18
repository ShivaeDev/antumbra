import { Database } from "@antumbra/persistence";
import type { HeldResource } from "@antumbra/resource-reclamation";
import { Effect, Option } from "effect";
import { changeRow } from "#change-read.ts";
import { pieceChangeRow } from "#change-rows.ts";
import { heldBerths } from "#held-berths.ts";

const heldResource = (resource: HeldResource) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const repo = yield* db.Repo.where({ source: resource.source }).first();
		if (Option.isNone(repo)) {
			return new Map<string, string>();
		}
		const changes = yield* Effect.forEach(
			yield* db.Change.where({
				headRef: resource.branch,
				repoId: repo.value.id,
			}).all(),
			changeRow,
		);
		const pieceChanges = yield* Effect.forEach(changes, (change) =>
			db.PieceChange.where({ changeId: change.id })
				.all()
				.pipe(Effect.flatMap((rows) => Effect.forEach(rows, pieceChangeRow))),
		);
		return heldBerths([resource], changes, [repo.value], pieceChanges.flat());
	});

export const readHeldResources = (resources: ReadonlyArray<HeldResource>) =>
	Effect.forEach(resources, heldResource).pipe(
		Effect.map((held) => new Map(held.flatMap((entries) => [...entries]))),
	);
