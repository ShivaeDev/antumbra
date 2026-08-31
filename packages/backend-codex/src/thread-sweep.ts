import type { BackendFailure } from "@antumbra/plugin-api";
import { Effect, Option, Schema } from "effect";
import { codexFailure } from "#failure.ts";
import { ThreadListResponse, type ThreadStatus } from "#protocol.ts";
import type { Request } from "#requests.ts";

export interface SpawnedChild {
	readonly agentNickname: string | undefined;
	readonly agentPath: string | undefined;
	readonly agentRole: string | undefined;
	readonly parentThreadId: string;
	readonly threadId: string;
	readonly working: boolean;
}

export type CensusSweep = ReadonlyArray<SpawnedChild>;

// Codex caps thread-list pages at 100 rows.
const PAGE = 100;
const PAGES = 200;

const decodeListing = Schema.decodeUnknownOption(ThreadListResponse);

const named = (value: string | null | undefined): string | undefined => (value === null ? undefined : value);

const isWorking = (status: typeof ThreadStatus.Type): boolean => status.type === "active";

const childrenOf = (listed: typeof ThreadListResponse.Type): ReadonlyArray<SpawnedChild> =>
	listed.data.map((thread) => {
		const spawn = thread.source.subAgent.thread_spawn;
		return {
			agentNickname: named(spawn.agent_nickname),
			agentPath: named(spawn.agent_path),
			agentRole: named(spawn.agent_role),
			parentThreadId: spawn.parent_thread_id,
			threadId: thread.id,
			working: isWorking(thread.status),
		};
	});

const listed = (found: ReadonlyMap<string, SpawnedChild>, children: ReadonlyArray<SpawnedChild>): ReadonlyMap<string, SpawnedChild> => {
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

// Codex thread-list pages can overlap; deduplicate by thread id.
const sweepPage = (page: SweepPage): Effect.Effect<CensusSweep, BackendFailure> =>
	Effect.gen(function* () {
		if (page.pagesLeft === 0) {
			return yield* Effect.fail(codexFailure("its listing of this session's threads never ended"));
		}
		const response = yield* page.request("thread/list", {
			ancestorThreadId: page.rootThreadId,
			...(page.cursor === undefined ? {} : { cursor: page.cursor }),
			limit: PAGE,
		});
		const decoded = decodeListing(response);
		if (Option.isNone(decoded)) {
			return yield* Effect.fail(codexFailure("it answered in a shape this backend cannot read"));
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

// Codex thread/list with ancestorThreadId returns the descendant tree without attaching to it.
export const sweepSpawnedDescendants = (request: Request, rootThreadId: string): Effect.Effect<CensusSweep, BackendFailure> =>
	sweepPage({
		cursor: undefined,
		found: new Map(),
		pagesLeft: PAGES,
		request,
		rootThreadId,
	});
