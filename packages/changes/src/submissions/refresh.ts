import { Database } from "@antumbra/persistence";
import type { ChangeRef } from "@antumbra/plugin-api";
import { Effect } from "effect";
import type { ChangeRow } from "#change-rows.ts";
import { UnknownChangeHostTag } from "#errors.ts";
import { ChangeHostRegistry } from "#registries.ts";
import { applyObservations } from "#submissions/observations.ts";
import { watchableChanges } from "#submissions/watchable.ts";

const changeRef = (
	row: ChangeRow,
	repos: ReadonlyMap<
		string,
		{
			readonly defaultRef: string;
			readonly id: string;
			readonly name: string;
			readonly source: string;
		}
	>,
): ReadonlyArray<ChangeRef> => {
	const repo = repos.get(row.repoId);
	return repo === undefined || row.externalId === null
		? []
		: [
				{
					externalId: row.externalId,
					repo,
				},
			];
};

export const refreshSubmittedChanges = Effect.fn("Changes.refresh")(function* (hostTag: string) {
	const db = yield* Database;
	const hosts = yield* ChangeHostRegistry;
	const host = hosts.get(hostTag);
	if (host === undefined) {
		return yield* new UnknownChangeHostTag({ tag: hostTag });
	}
	const changes = yield* watchableChanges(hostTag);
	const repoIds = changes.map((change) => change.repoId);
	const repos = new Map((yield* db.Repo.where((repo) => repo.id.in(repoIds)).all()).map((repo) => [repo.id, repo] as const));
	const refs = changes.flatMap((row) => changeRef(row, repos));
	return refs.length === 0 ? [] : yield* applyObservations(hostTag, yield* host.observe(refs));
});
