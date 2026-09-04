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

// Codex thread/list with ancestorThreadId returns the descendant tree without attaching to it.
export const sweepSpawnedDescendants = Effect.fn("Codex.sweepSpawnedDescendants")(function* (
	request: Request,
	rootThreadId: string,
): Effect.fn.Return<CensusSweep, BackendFailure> {
	const found = new Map<string, SpawnedChild>();
	let cursor: string | undefined;
	for (let page = 0; page < PAGES; page++) {
		const response = yield* request("thread/list", {
			ancestorThreadId: rootThreadId,
			...(cursor === undefined ? {} : { cursor }),
			limit: PAGE,
		});
		const decoded = decodeListing(response);
		if (Option.isNone(decoded)) {
			return yield* Effect.fail(codexFailure("it answered in a shape this backend cannot read"));
		}
		for (const child of childrenOf(decoded.value)) {
			found.set(child.threadId, child);
		}
		const nextCursor = named(decoded.value.nextCursor);
		if (nextCursor === undefined || nextCursor === cursor) {
			return [...found.values()];
		}
		cursor = nextCursor;
	}
	return yield* Effect.fail(codexFailure("its listing of this session's threads never ended"));
});
