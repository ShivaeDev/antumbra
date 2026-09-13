import { RepoId } from "@antumbra/domain-repos/ids.ts";
import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { ChangeId } from "#ids.ts";
import { quayChange } from "#rows/quay-change.ts";

export const QuayStatus = Schema.Literals(["all", "alongside", "archived", "checksRunning", "draft", "landed", "needsAttention"]);

const listedAt = (row: typeof quayChange.Row.Type): number => {
	if (row.archivedAt === null) return Date.parse(row.activityAt);
	const landed = row.landedAt ?? row.withdrawnAt;
	return Date.parse(landed ?? row.activityAt);
};

export const browse = query("browse", {
	input: { query: Schema.String, repositoryId: Schema.NullOr(RepoId), status: QuayStatus, selectedId: Schema.NullOr(ChangeId) },
	output: Schema.Struct({
		rows: Schema.Array(quayChange.Row),
		total: Schema.Number,
		waiting: Schema.Number,
		selected: Schema.NullOr(quayChange.Row),
		repositories: Schema.Array(Schema.Struct({ id: RepoId, name: Schema.String })),
		sightedAt: Schema.NullOr(Schema.String),
	}),
	reads: [quayChange, repo],
	run: Effect.fn("changes.browse")(function* (input, rows) {
		const all = (yield* rows.quayChange.where({})).toSorted((left, right) => listedAt(right) - listedAt(left));
		const query = input.query.trim().toLocaleLowerCase();
		const repositories = (yield* rows.repo.where({})).map((row) => ({ id: row.id, name: row.name }));
		const found = all.filter(
			(row) =>
				(input.repositoryId === null || row.repoId === input.repositoryId) &&
				(input.status === "all" ? row.group !== "archived" : row.group === input.status) &&
				(query === "" ||
					[
						row.title,
						row.externalId === null ? "" : `#${row.externalId}`,
						row.repoName,
						row.headRef,
						...row.pieces.flatMap((piece) => [piece.voyageName, piece.title]),
					]
						.join(" ")
						.toLocaleLowerCase()
						.includes(query)),
		);
		return {
			rows: found,
			total: all.length,
			waiting: all.filter((row) => row.group !== "archived" && row.group !== "landed").length,
			selected: all.find((row) => row.id === input.selectedId) ?? null,
			repositories: repositories.toSorted((left, right) => left.name.localeCompare(right.name)),
			sightedAt:
				all
					.map((row) => row.observedAt)
					.toSorted()
					.at(-1) ?? null,
		};
	}),
});
