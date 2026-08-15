import type { PrismaError } from "@antumbra/persistence";
import type { RepoRequest } from "@antumbra/plugin-api";
import { Effect, Option, PubSub } from "effect";
import { type AgentDeps, provideExecutors } from "#deps.ts";

export interface RegisteredRepo {
	readonly defaultRef: string;
	readonly id: string;
	readonly name: string;
	readonly source: string;
}

export interface RepoRegistration {
	readonly defaultRef: string;
	readonly source: string;
}

export interface RepoRegistry {
	readonly forget: (id: string) => Effect.Effect<void, PrismaError>;
	readonly list: Effect.Effect<ReadonlyArray<RegisteredRepo>, PrismaError>;
	readonly register: (
		registration: RepoRegistration,
	) => Effect.Effect<RegisteredRepo, PrismaError>;
}

export const repoName = (source: string): string => {
	const trimmed = source.replace(/\/+$/, "").replace(/\.git$/, "");
	const last = trimmed.split(/[/:]/).at(-1) ?? "";
	return last === "" ? "repo" : last;
};

const summarize = (row: {
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

export const listRepos = (
	deps: AgentDeps,
): Effect.Effect<ReadonlyArray<RegisteredRepo>, PrismaError> =>
	provideExecutors(deps)(
		deps.db.Repo.orderBy((repo) => repo.createdAt.asc()).all(),
	).pipe(Effect.map((rows) => rows.map(summarize)));

// why: the registry is what every spawn is moored to — read at provision
// time, never copied into a payload, so a queued spawn sees the repos that
// exist when it runs.
export const berthRequests = (
	deps: AgentDeps,
): Effect.Effect<ReadonlyArray<RepoRequest>, PrismaError> =>
	listRepos(deps).pipe(
		Effect.map((repos) =>
			repos.map((repo) => ({ ref: repo.defaultRef, source: repo.source })),
		),
	);

// why: registering is idempotent by source — the same repo entered twice
// refreshes its default ref instead of duplicating its berths on every spawn.
const registerRepo = (deps: AgentDeps, registration: RepoRegistration) => {
	const provide = provideExecutors(deps);
	return Effect.gen(function* () {
		const existing = yield* provide(
			deps.db.Repo.where({ source: registration.source }).first(),
		);
		if (Option.isSome(existing)) {
			yield* provide(
				deps.writer.write(
					deps.db.Repo.where({ id: existing.value.id }).update({
						defaultRef: registration.defaultRef,
					}),
				),
			);
			yield* PubSub.publish(deps.feeds.fleet, undefined);
			return summarize({ ...existing.value, ...registration });
		}
		const row = {
			defaultRef: registration.defaultRef,
			id: crypto.randomUUID(),
			name: repoName(registration.source),
			source: registration.source,
		};
		yield* provide(deps.writer.write(deps.db.Repo.create(row)));
		yield* PubSub.publish(deps.feeds.fleet, undefined);
		return summarize(row);
	});
};

// why: forgetting a repo only changes what future spawns are moored to —
// berths already cut from it belong to their agents and are swept on their
// own schedule.
const forgetRepo = (deps: AgentDeps, id: string) =>
	provideExecutors(deps)(
		deps.writer.write(deps.db.Repo.where({ id }).deleteAll()),
	).pipe(
		Effect.andThen(PubSub.publish(deps.feeds.fleet, undefined)),
		Effect.asVoid,
	);

export const makeRepoRegistry = (deps: AgentDeps): RepoRegistry => ({
	forget: (id) => forgetRepo(deps, id),
	list: listRepos(deps),
	register: (registration) => registerRepo(deps, registration),
});
