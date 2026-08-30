import type { QuayGroup, QuayRow, QuayView } from "@antumbra/contract";

export interface QuayChange {
	readonly baseRef: string;
	readonly berthings: ReadonlyArray<QuayRow>;
	readonly body: string;
	readonly change: QuayRow["change"];
	readonly group: QuayGroup;
	readonly headRef: string;
	readonly headSha: string | null;
	readonly originSessionId: string | null;
}

export type QuayStatusFilter = QuayGroup | "all";

export interface QuayFilters {
	readonly query: string;
	readonly repositoryId: string | null;
	readonly status: QuayStatusFilter;
}

export interface QuayRepository {
	readonly id: string;
	readonly name: string;
}

export const quayStatusFrom = (value: string): QuayStatusFilter => {
	switch (value) {
		case "alongside":
		case "checksRunning":
		case "draft":
		case "needsAttention":
			return value;
		default:
			return "all";
	}
};

const changeFrom = (row: QuayRow): QuayChange => ({
	baseRef: row.baseRef,
	berthings: [row],
	body: row.body,
	change: row.change,
	group: row.group,
	headRef: row.headRef,
	headSha: row.headSha,
	originSessionId: row.originSessionId,
});

// why: the domain repeats a Change once per Piece/Voyage berth so every owner
// is named. The master rail names pull requests, so it folds those rows back
// to one selection while the detail keeps every place the work is owed.
export const quayChanges = (view: QuayView): ReadonlyArray<QuayChange> => {
	const changes = new Map<string, QuayChange>();
	for (const row of view.rows) {
		const current = changes.get(row.change.id);
		changes.set(row.change.id, current === undefined ? changeFrom(row) : { ...current, berthings: [...current.berthings, row] });
	}
	return [...changes.values()];
};

export const repositoriesOf = (changes: ReadonlyArray<QuayChange>): ReadonlyArray<QuayRepository> => {
	const repositories = new Map<string, QuayRepository>();
	for (const item of changes) {
		repositories.set(item.change.repoId, {
			id: item.change.repoId,
			name: item.change.repoName,
		});
	}
	return [...repositories.values()].sort((left, right) => left.name.localeCompare(right.name));
};

const searchableText = (item: QuayChange): string =>
	[
		item.change.title,
		item.change.externalId === null ? "" : `#${item.change.externalId}`,
		item.change.repoName,
		item.headRef,
		...item.berthings.flatMap((row) => [row.voyageName, row.pieceTitle]),
	]
		.join(" ")
		.toLocaleLowerCase();

export const filterQuayChanges = (changes: ReadonlyArray<QuayChange>, filters: QuayFilters): ReadonlyArray<QuayChange> => {
	const query = filters.query.trim().toLocaleLowerCase();
	return changes.filter(
		(item) =>
			(filters.repositoryId === null || item.change.repoId === filters.repositoryId) &&
			(filters.status === "all" || item.group === filters.status) &&
			(query === "" || searchableText(item).includes(query)),
	);
};
