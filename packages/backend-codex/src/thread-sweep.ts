import type { BackendFailure } from "@antumbra/plugin-api";
import { Effect, Option, Schema } from "effect";
import { codexFailure } from "#failure.ts";
import { ThreadListResponse } from "#protocol.ts";
import type { Request } from "#requests.ts";

// why: one delegated thread as codex names it — the parent it was spawned from,
// and whatever codex called the agent that ran in it. The names are optional
// because codex does not always give them, and an absent one leaves the record
// silent rather than filled with a guess.
export interface SpawnedChild {
	readonly agentNickname: string | undefined;
	readonly agentPath: string | undefined;
	readonly agentRole: string | undefined;
	readonly parentThreadId: string;
	readonly threadId: string;
}

// why: what a sweep concluded, for the rehearsals and callers that hold one.
// A sweep either read the whole tree or failed; there is no third answer, which
// is why a shortened one is never returned.
export type CensusSweep = ReadonlyArray<SpawnedChild>;

// why: the server caps a page at a hundred whatever we ask for, so a hundred is
// what is asked for and the cursor is followed to exhaustion. The page ceiling
// is a stop for a cursor that never ends: a sweep that hits it has not read the
// whole tree, and says so by failing rather than by returning what it happened
// to reach.
const PAGE = 100;
const PAGES = 200;

const decodeListing = Schema.decodeUnknownOption(ThreadListResponse);

const named = (value: string | null | undefined): string | undefined =>
	value === null ? undefined : value;

const childrenOf = (
	listed: typeof ThreadListResponse.Type,
): ReadonlyArray<SpawnedChild> =>
	listed.data.map((thread) => {
		const spawn = thread.source.subAgent.thread_spawn;
		return {
			agentNickname: named(spawn.agent_nickname),
			agentPath: named(spawn.agent_path),
			agentRole: named(spawn.agent_role),
			parentThreadId: spawn.parent_thread_id,
			threadId: thread.id,
		};
	});

const listed = (
	found: ReadonlyMap<string, SpawnedChild>,
	children: ReadonlyArray<SpawnedChild>,
): ReadonlyMap<string, SpawnedChild> => {
	const next = new Map(found);
	for (const child of children) {
		next.set(child.threadId, child);
	}
	return next;
};

interface SweepPage {
	readonly cursor: string | undefined;
	readonly found: ReadonlyMap<string, SpawnedChild>;
	readonly pagesLeft: number;
	readonly request: Request;
	readonly rootThreadId: string;
}

// why: pages overlap. The server sorts by a timestamp and a thread written
// while the sweep is walking can be handed back twice or shift a page boundary,
// so a thread id is the key rather than the order it arrived in. A cursor that
// repeats itself is a server that has stopped advancing, and following it again
// would spin forever on the same page.
const sweepPage = (
	page: SweepPage,
): Effect.Effect<CensusSweep, BackendFailure> =>
	Effect.gen(function* () {
		if (page.pagesLeft === 0) {
			return yield* Effect.fail(
				codexFailure("its listing of this session's threads never ended"),
			);
		}
		const response = yield* page.request("thread/list", {
			ancestorThreadId: page.rootThreadId,
			...(page.cursor === undefined ? {} : { cursor: page.cursor }),
			limit: PAGE,
		});
		const decoded = decodeListing(response);
		if (Option.isNone(decoded)) {
			return yield* Effect.fail(
				codexFailure("it answered in a shape this backend cannot read"),
			);
		}
		const found = listed(page.found, childrenOf(decoded.value));
		const cursor = named(decoded.value.nextCursor);
		return cursor === undefined || cursor === page.cursor
			? [...found.values()]
			: yield* sweepPage({
					...page,
					cursor,
					found,
					pagesLeft: page.pagesLeft - 1,
				});
	});

// why: codex's own answer to "which threads did this session ever delegate
// to". Asked by ancestor it returns the whole spawn tree below the root at any
// depth, the children whose first turn left no preview included — which is the
// one reading that has been shown to be complete. It is a read and stays one:
// nothing here goes near thread/start or thread/resume, because a delegated
// thread is recorded by listening and never by taking it over.
export const sweepSpawnedDescendants = (
	request: Request,
	rootThreadId: string,
): Effect.Effect<CensusSweep, BackendFailure> =>
	sweepPage({
		cursor: undefined,
		found: new Map(),
		pagesLeft: PAGES,
		request,
		rootThreadId,
	});
