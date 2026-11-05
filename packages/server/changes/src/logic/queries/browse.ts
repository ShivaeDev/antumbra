import type * as Source from "@antumbra/domain-changes/queries/browse.ts";
import type { quayChange } from "@antumbra/domain-changes/rows/quay-change.ts";
import { selection as quayChangeSelection } from "@antumbra/server-storage/records/quay-change.ts";
import { selection as repoSelection } from "@antumbra/server-storage/records/repo.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Schema } from "effect";

export const QuayStatus = Schema.Literals(["all", "alongside", "archived", "checksRunning", "draft", "landed", "needsAttention"]);

const listedAt = (row: typeof quayChange.Row.Type): number => {
	if (row.archivedAt === null) return Date.parse(row.activityAt);
	const landed = row.landedAt ?? row.withdrawnAt;
	return Date.parse(landed ?? row.activityAt);
};

export const browse = Effect.fn("changes.browse")(function* (
	input: Schema.Struct.Type<typeof Source.browse.input>,
): Effect.fn.Return<typeof Source.browse.output.Type, never, Records> {
	const rows = yield* Records;

	const all = (yield* rows.quayChange
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: quayChangeSelection })
		.pipe(Effect.orDie)).toSorted((left, right) => listedAt(right) - listedAt(left));
	const query = input.query.trim().toLocaleLowerCase();
	const repositories = (yield* rows.repo
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: repoSelection })
		.pipe(Effect.orDie)).map((row) => ({ id: row.id, name: row.name }));
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
});
