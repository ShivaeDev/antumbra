import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type PrismaError } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { RepoSlugTaken } from "#errors.ts";
import { summarizeRepo } from "#list.ts";
import type { RepoRegistration } from "#model.ts";
import { repoName, repoSlug } from "#repo-name.ts";

// why: registration is the only writer of the registry, so the slug a berth
// will carry is kept unique here or nowhere — no stored column holds it for
// the database to constrain.
const refuseTakenSlug = (source: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const slug = repoSlug(source);
		const rows = yield* db.Repo.all();
		const holder = rows.find((row) => repoSlug(row.source) === slug);
		if (holder !== undefined) {
			return yield* new RepoSlugTaken({
				registeredSource: holder.source,
				slug,
				source,
			});
		}
	});

const recoverRepoCreate = (
	registration: RepoRegistration,
	failure: PrismaError,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const bySource = db.Repo.where({ source: registration.source });
		const winner = yield* bySource.first();
		if (Option.isNone(winner)) {
			return yield* failure;
		}
		yield* bySource.update({ defaultRef: registration.defaultRef });
		return { ...winner.value, ...registration };
	});

// why: registering is idempotent by source — the same repo entered twice
// refreshes its default ref instead of duplicating its berths on every spawn.
export const registerRepo = (registration: RepoRegistration) =>
	Effect.gen(function* () {
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
		yield* refuseTakenSlug(registration.source);
		const row = {
			defaultRef: registration.defaultRef,
			id: crypto.randomUUID(),
			name: repoName(registration.source),
			source: registration.source,
		};
		const stored = yield* db.Repo.create(row).pipe(
			Effect.as(row),
			Effect.catchTag("PrismaError", (failure) =>
				recoverRepoCreate(registration, failure),
			),
		);
		yield* feeds.publishFleetRefresh();
		return summarizeRepo(stored);
	});
