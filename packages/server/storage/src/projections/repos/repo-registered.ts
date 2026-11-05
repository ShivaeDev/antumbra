import type { repoRegistered } from "@antumbra/domain-repos/facts/repo-registered.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const repoRegisteredMaterializer = Effect.fn("repos.RepoRegistered")(function* (
	fact: FactValue<typeof repoRegistered>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	if (
		yield* rows.repo.count({ where: { id: fact.id } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		)
	) {
		yield* rows.repo.updateVoid({ ...{ defaultRef: fact.defaultRef }, id: fact.id }).pipe(Effect.orDie);
	} else {
		yield* rows.repo.insertVoid(fact).pipe(Effect.orDie);
	}
});
