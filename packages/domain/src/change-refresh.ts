import type { PrismaError } from "@antumbra/persistence";
import type { ChangeHostError, ChangeRef } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { namedChangeHost } from "#change-host-resolve.ts";
import { applyObservations } from "#change-observe.ts";
import { openChangesOfHost } from "#change-read.ts";
import type { ChangeRow } from "#change-rows.ts";
import type { AgentDeps } from "#deps.ts";
import type { UnknownChangeHostTag } from "#errors.ts";
import { listRepos } from "#registry.ts";

// why: the seam a watcher cadence and a window's refresh both pull. Nothing
// here decides how often it runs — asking is one act, and how patiently it
// repeats is a policy that lives above this function.
export const refreshChanges = (
	deps: AgentDeps,
	hostTag: string,
): Effect.Effect<
	ReadonlyArray<ChangeRow>,
	ChangeHostError | PrismaError | UnknownChangeHostTag
> =>
	Effect.gen(function* () {
		const host = yield* namedChangeHost(deps, hostTag);
		const watchable = yield* openChangesOfHost(deps, hostTag);
		const repos = new Map(
			(yield* listRepos(deps)).map((repo) => [repo.id, repo] as const),
		);
		const refs = watchable.flatMap((row): ReadonlyArray<ChangeRef> => {
			const repo = repos.get(row.repoId);
			return repo === undefined || row.externalId === null
				? []
				: [{ externalId: row.externalId, repo }];
		});
		if (refs.length === 0) {
			return [];
		}
		return yield* applyObservations(deps, hostTag, yield* host.observe(refs));
	});
