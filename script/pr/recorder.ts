import { Effect } from "effect";
import { type Get, type Outcome, type Page, type Resource, readPaged } from "#pr/pages.ts";

export type Etags = ReadonlyMap<string, readonly Page[]>;

type Recorded = { readonly etags: Etags; readonly read: (resource: Resource) => Effect.Effect<Outcome> };

export const recorder = (get: Get, known: Etags): Recorded => {
	const etags = new Map<string, readonly Page[]>();
	return {
		etags,
		read: (resource) =>
			readPaged(get, resource, known.get(resource.path) ?? []).pipe(
				Effect.tap((paged) => Effect.sync(() => etags.set(resource.path, paged.pages))),
				Effect.map((paged) => paged.outcome),
			),
	};
};

export const keptEtags = (recorded: Recorded, known: Etags, failed: boolean): Etags => {
	if (!failed) return recorded.etags;
	const kept = new Map<string, readonly Page[]>();
	for (const path of recorded.etags.keys()) {
		const pages = known.get(path);
		if (pages !== undefined) kept.set(path, pages);
	}
	return kept;
};
