import type { SessionCensus } from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/vocabulary/session-events.ts";
import { rawOf } from "#mapping.ts";
import type { CensusSweep, SpawnedChild } from "#thread-sweep.ts";

const SWEEP = "thread/list";

export const censusUnreadable = (rootThreadId: string, failure: string): SessionCensus => ({
	events: [
		{
			detail: `codex could not be asked which threads this session delegated to, so its census could not be checked: ${failure}`,
			gapKind: "unknown",
			raw: rawOf(SWEEP, { ancestorThreadId: rootThreadId }),
			type: "subsession.gap",
		},
	],
	nodes: [],
});

const opening = (child: SpawnedChild): AgentEvent => ({
	...(child.agentPath === undefined ? {} : { kind: child.agentPath }),
	...(child.agentNickname === undefined ? {} : { label: child.agentNickname }),
	parentRef: child.parentThreadId,
	raw: rawOf(SWEEP, child),
	spawnedBy: child.threadId,
	subsessionRef: child.threadId,
	type: "subsession.opened",
});

const cast = (child: SpawnedChild): string => (child.agentRole === undefined ? "" : ` as ${child.agentRole}`);

const missed = (child: SpawnedChild): AgentEvent => ({
	detail: `codex names this thread a descendant this session spawned${cast(child)}, and the stream never carried it`,
	gapKind: "census-missing",
	origin: { node: child.threadId, spawnedBy: child.threadId },
	raw: rawOf(SWEEP, child),
	type: "subsession.gap",
});

export const censusOf = (admitted: (threadId: string) => boolean, sweep: CensusSweep): SessionCensus => ({
	events: sweep.filter((child) => !admitted(child.threadId)).flatMap((child) => [opening(child), missed(child)]),
	nodes: sweep.map((child) => ({
		nodeRef: child.threadId,
		working: child.working,
	})),
});
