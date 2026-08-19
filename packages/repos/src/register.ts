import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, Writer } from "@antumbra/persistence";
import { Effect, Option, PubSub } from "effect";
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

// why: registering is idempotent by source — the same repo entered twice
// refreshes its default ref instead of duplicating its berths on every spawn.
export const registerRepo = (registration: RepoRegistration) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const feeds = yield* DomainFeeds;
		const writer = yield* Writer;
		const existing = yield* db.Repo.where({
			source: registration.source,
		}).first();
		if (Option.isSome(existing)) {
			yield* writer.write(
				db.Repo.where({ id: existing.value.id }).update({
					defaultRef: registration.defaultRef,
				}),
			);
			yield* PubSub.publish(feeds.fleet, undefined);
			return summarizeRepo({ ...existing.value, ...registration });
		}
		yield* refuseTakenSlug(registration.source);
		const row = {
			defaultRef: registration.defaultRef,
			id: crypto.randomUUID(),
			name: repoName(registration.source),
			source: registration.source,
		};
		yield* writer.write(db.Repo.create(row));
		yield* PubSub.publish(feeds.fleet, undefined);
		return summarizeRepo(row);
	});
