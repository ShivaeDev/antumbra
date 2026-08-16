import type { PrismaError } from "@antumbra/persistence";
import type { ChangeHostError } from "@antumbra/plugin-api";
import { Clock, Effect, Option, PubSub } from "effect";
import {
	capableHost,
	requireBerth,
	requireChangeHost,
	requireRepo,
} from "#change-host-resolve.ts";
import { changeOfExternalId } from "#change-read.ts";
import type { ChangeRow } from "#change-rows.ts";
import { announceChanges, linkPiece, proposedChange } from "#change-write.ts";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import type {
	BerthNotFound,
	NoChangeHost,
	PieceNotFound,
	RepoNotFound,
} from "#errors.ts";
import { requirePiece } from "#outcomes.ts";

export interface OpenChangeInput {
	readonly agentId: string;
	readonly base: string | null;
	readonly body: string;
	readonly draft: boolean;
	readonly pieceId: string;
	readonly repoName: string;
	readonly title: string;
}

// why: a change made by hand has no agent behind it — the person at the window
// adopts it, and a null opener records that rather than crediting whoever
// happened to be at work on the piece.
export interface AdoptChangeInput {
	readonly agentId: string | null;
	readonly pieceId: string;
	readonly repoName: string;
	readonly url: string;
}

export type AdoptChangeFailure =
	| ChangeHostError
	| NoChangeHost
	| PieceNotFound
	| PrismaError
	| RepoNotFound;

export type OpenChangeFailure = AdoptChangeFailure | BerthNotFound;

export const openChange = (
	deps: AgentDeps,
	input: OpenChangeInput,
): Effect.Effect<ChangeRow, OpenChangeFailure> =>
	Effect.gen(function* () {
		yield* requirePiece(deps, input.pieceId);
		const repo = yield* requireRepo(deps, input.repoName);
		const host = yield* capableHost(yield* requireChangeHost(deps, repo));
		const berth = yield* requireBerth(deps, input.agentId, repo);
		const observation = yield* host.open({
			base: input.base,
			berth,
			body: input.body,
			draft: input.draft,
			repo,
			title: input.title,
		});
		const row = proposedChange({
			body: input.body,
			host: host.tag,
			now: yield* Clock.currentTimeMillis,
			observation,
			openedByAgentId: input.agentId,
			repoId: repo.id,
		});
		// why: the change and the link to its piece are written together — a
		// change no piece points at would be an outcome nobody is waiting on.
		yield* provideExecutors(deps)(
			deps.writer.write(
				deps.db.Change.create(row).pipe(
					Effect.andThen(linkPiece(deps, input.pieceId, row.id)),
				),
			),
		);
		yield* announceChanges(deps);
		// why: a change that just reached a host has news to give sooner than any
		// cadence would guess, so the watcher is rung rather than waited on.
		yield* PubSub.publish(deps.feeds.changeRefresh, undefined);
		return row;
	});

// why: a change opened by hand is adopted by its url — the host is asked what
// it is, and a change this system already knows gains a second piece rather
// than a second row.
export const adoptChange = (
	deps: AgentDeps,
	input: AdoptChangeInput,
): Effect.Effect<ChangeRow, AdoptChangeFailure> =>
	Effect.gen(function* () {
		yield* requirePiece(deps, input.pieceId);
		const repo = yield* requireRepo(deps, input.repoName);
		const host = yield* capableHost(yield* requireChangeHost(deps, repo));
		const observation = yield* host.adopt(input.url, repo);
		const now = yield* Clock.currentTimeMillis;
		const row = yield* provideExecutors(deps)(
			deps.writer.write(
				Effect.gen(function* () {
					const known = yield* changeOfExternalId(
						deps,
						host.tag,
						repo.id,
						observation.externalId,
					);
					const row = Option.getOrElse(known, () =>
						proposedChange({
							body: "",
							host: host.tag,
							now,
							observation,
							openedByAgentId: input.agentId,
							repoId: repo.id,
						}),
					);
					if (Option.isNone(known)) {
						yield* deps.db.Change.create(row);
					}
					yield* linkPiece(deps, input.pieceId, row.id);
					return row;
				}),
			),
		);
		yield* announceChanges(deps);
		yield* PubSub.publish(deps.feeds.changeRefresh, undefined);
		return row;
	});
