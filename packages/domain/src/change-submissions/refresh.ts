import { Database } from "@antumbra/persistence";
import type { ChangeRef } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { changeRow } from "#change-read.ts";
import { applyObservations } from "#change-submissions/observations.ts";
import { ChangeHostRegistry } from "#change-submissions/registries.ts";
import { UnknownChangeHostTag } from "#errors.ts";

export const watchableChanges = (hostTag: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return (yield* db.Change.where({ host: hostTag }).all())
			.map(changeRow)
			.filter((row) => row.stage === "open" || row.stage === "withdrawn");
	});

const changeRef = (
	row: ReturnType<typeof changeRow>,
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
					repo: {
						defaultRef: repo.defaultRef,
						id: repo.id,
						name: repo.name,
						source: repo.source,
					},
				},
			];
};

export const refreshSubmittedChanges = (hostTag: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const hosts = yield* ChangeHostRegistry;
		const host = hosts.get(hostTag);
		if (host === undefined) {
			return yield* new UnknownChangeHostTag({ tag: hostTag });
		}
		const changes = yield* watchableChanges(hostTag);
		const repos = new Map(
			(yield* db.Repo.all()).map((repo) => [repo.id, repo] as const),
		);
		const refs = changes.flatMap((row) => changeRef(row, repos));
		return refs.length === 0
			? []
			: yield* applyObservations(hostTag, yield* host.observe(refs));
	});
