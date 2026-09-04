import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { RepoSlugTaken } from "#errors.ts";
import type { RegisteredRepo, RepoRegistration } from "#model.ts";
import { repoName, repoSlug } from "#repo-name.ts";

const summarizeRepo = (row: {
	readonly defaultRef: string;
	readonly id: string;
	readonly name: string;
	readonly source: string;
}): RegisteredRepo => ({
	defaultRef: row.defaultRef,
	id: row.id,
	name: row.name,
	source: row.source,
});

export const registerRepo = Effect.fn("Repos.register")(function* (registration: RepoRegistration) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const bySource = db.Repo.where({ source: registration.source });
	const existing = yield* bySource.first();
	if (Option.isSome(existing)) {
		yield* bySource.update({
			defaultRef: registration.defaultRef,
		});
		yield* feeds.publishFleetRefresh();
		return summarizeRepo({ ...existing.value, ...registration });
	}
	const slug = repoSlug(registration.source);
	const holder = (yield* db.Repo.all()).find((row) => repoSlug(row.source) === slug);
	if (holder !== undefined) {
		return yield* new RepoSlugTaken({
			registeredSource: holder.source,
			slug,
			source: registration.source,
		});
	}
	const row = {
		defaultRef: registration.defaultRef,
		id: crypto.randomUUID(),
		name: repoName(registration.source),
		source: registration.source,
	};
	yield* db.Repo.create(row);
	yield* feeds.publishFleetRefresh();
	return summarizeRepo(row);
});
