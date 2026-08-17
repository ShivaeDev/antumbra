import type { PrismaError } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import type { ChangeHostError } from "@antumbra/plugin-api";
import { Clock, Effect, Option, PubSub } from "effect";
import {
	capableHost,
	requireChangeHost,
	requireRepo,
} from "#change-host-resolve.ts";
import { changeOfExternalId } from "#change-read.ts";
import type { ChangeRow } from "#change-rows.ts";
import {
	ChangeSubmissions,
	type OpenChangeFailure,
	type OpenChangeInput,
	type SubmitChangeFailure,
	type SubmitChangeInput,
} from "#change-submissions/change-submissions.ts";
import { announceChanges, linkPiece, proposedChange } from "#change-write.ts";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import type { NoChangeHost, PieceNotFound, RepoNotFound } from "#errors.ts";

export type {
	OpenChangeFailure,
	OpenChangeInput,
	SubmitChangeFailure,
	SubmitChangeInput,
} from "#change-submissions/change-submissions.ts";

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

export const openChange = (
	input: OpenChangeInput,
): Effect.Effect<ChangeRow, OpenChangeFailure, ChangeSubmissions> =>
	Effect.flatMap(ChangeSubmissions, (changes) => changes.open(input));

export const submitChange = (
	input: SubmitChangeInput,
): Effect.Effect<ChangeRow, SubmitChangeFailure, ChangeSubmissions> =>
	Effect.flatMap(ChangeSubmissions, (changes) => changes.submit(input));

// why: a change opened by hand is adopted by its url — the host is asked what
// it is, and a change this system already knows gains a second piece rather
// than a second row.
export const adoptChange = (
	deps: AgentDeps,
	input: AdoptChangeInput,
): Effect.Effect<ChangeRow, AdoptChangeFailure, Pieces> =>
	Effect.gen(function* () {
		const pieces = yield* Pieces;
		yield* pieces.require(input.pieceId);
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
