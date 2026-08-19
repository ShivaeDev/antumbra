import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type PrismaError, Writer } from "@antumbra/persistence";
import { Effect, Option, PubSub } from "effect";
import { summarizeRepo } from "#list.ts";
import type { RegisteredRepo, RepoRegistration } from "#model.ts";
import { repoName } from "#repo-name.ts";
import type { ReposRequirements } from "#requirements.ts";

// why: registering is idempotent by source — the same repo entered twice
// refreshes its default ref instead of duplicating its berths on every spawn.
export const registerRepo = Effect.fn("repos.registerRepo")(function* (
	registration: RepoRegistration,
): ReposRequirements<RegisteredRepo, PrismaError> {
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
