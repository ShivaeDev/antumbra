import type { PrismaError } from "@antumbra/persistence";
import {
	type ChangeHost,
	type ChangeHostBerth,
	type ChangeHostRepo,
	ChangeHostUnavailable,
} from "@antumbra/plugin-api";
import { Effect, Option } from "effect";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import {
	BerthNotFound,
	NoChangeHost,
	RepoNotFound,
	UnknownChangeHostTag,
} from "#errors.ts";

export const requireRepo = (
	deps: AgentDeps,
	repoName: string,
): Effect.Effect<ChangeHostRepo, PrismaError | RepoNotFound> =>
	provideExecutors(deps)(deps.db.Repo.where({ name: repoName }).first()).pipe(
		Effect.flatMap(
			Option.match({
				onNone: () => new RepoNotFound({ repoName }),
				onSome: (row) =>
					Effect.succeed({
						defaultRef: row.defaultRef,
						id: row.id,
						name: row.name,
						source: row.source,
					}),
			}),
		),
	);

// why: a repo belongs to the first registered host that claims it, and a build
// where nothing claims it says so by name — the model asked for a change on a
// repo this system cannot open one against, and inventing a host would be a
// lie it could not act on.
export const requireChangeHost = (
	deps: AgentDeps,
	repo: ChangeHostRepo,
): Effect.Effect<ChangeHost, NoChangeHost> => {
	const claimed = [...deps.changeHosts.values()].find((host) =>
		host.supports(repo),
	);
	return claimed === undefined
		? new NoChangeHost({ repoName: repo.name })
		: Effect.succeed(claimed);
};

// why: asked before anything is pushed or written, so a host that cannot be
// reached is told to the agent as the host's own sentence — "run: gh auth
// login" — instead of surfacing halfway through an act it cannot undo.
export const capableHost = (
	host: ChangeHost,
): Effect.Effect<ChangeHost, ChangeHostUnavailable> =>
	host.capability.pipe(
		Effect.flatMap((capability) =>
			capability.available
				? Effect.succeed(host)
				: new ChangeHostUnavailable({
						detail: capability.detail,
						host: host.tag,
					}),
		),
	);

export const namedChangeHost = (
	deps: AgentDeps,
	tag: string,
): Effect.Effect<ChangeHost, UnknownChangeHostTag> => {
	const known = deps.changeHosts.get(tag);
	return known === undefined
		? new UnknownChangeHostTag({ tag })
		: Effect.succeed(known);
};

// why: a change is opened from the branch the agent is already working in, so
// the berth is the whole of what the host needs to know about this machine —
// an agent with no berth in that repo has nothing to propose.
export const requireBerth = (
	deps: AgentDeps,
	agentId: string,
	repo: ChangeHostRepo,
): Effect.Effect<ChangeHostBerth, BerthNotFound | PrismaError> =>
	provideExecutors(deps)(deps.db.Berth.where({ agentId }).all()).pipe(
		Effect.flatMap((berths) => {
			const berth = berths.find((row) => row.source === repo.source);
			return berth === undefined
				? new BerthNotFound({ agentId, repoName: repo.name })
				: Effect.succeed({ branch: berth.branch, path: berth.path });
		}),
	);
