import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { RepoSlugTaken } from "#errors.ts";
import { summarizeRepo } from "#list.ts";
import type { RepoRegistration } from "#model.ts";
import { repoName, repoSlug } from "#repo-name.ts";

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
		yield* db.Repo.create(row);
		yield* feeds.publishFleetRefresh();
		return summarizeRepo(row);
	});
