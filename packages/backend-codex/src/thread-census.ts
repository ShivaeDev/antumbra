import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { rawOf } from "#mapping.ts";
import type { CensusSweep, SpawnedChild } from "#thread-sweep.ts";

const SWEEP = "thread/list";

// why: the census has one source, and asking it is the whole of the reading —
// so a sweep that could not be taken leaves the record unable to say whether it
// saw everything, which is itself a fact about how complete this session is.
// Nothing is guessed in either direction: nothing is admitted, and no thread is
// called present or absent on the strength of an answer that never came.
export const censusUnreadable = (
	rootThreadId: string,
	failure: string,
): AgentEvent => ({
	detail: `codex could not be asked which threads this session delegated to, so its census could not be checked: ${failure}`,
	gapKind: "unknown",
	raw: rawOf(SWEEP, { ancestorThreadId: rootThreadId }),
	type: "subsession.gap",
});

// why: codex's own word for where the thread belongs, and its own words for
// what ran in it. Nothing is invented: a name codex did not give is a key that
// is not sent, so the row keeps the hole a later announcement can still fill.
const opening = (child: SpawnedChild): AgentEvent => ({
	...(child.agentPath === undefined ? {} : { kind: child.agentPath }),
	...(child.agentNickname === undefined ? {} : { label: child.agentNickname }),
	parentRef: child.parentThreadId,
	raw: rawOf(SWEEP, child),
	spawnedBy: child.threadId,
	subsessionRef: child.threadId,
	type: "subsession.opened",
});

const cast = (child: SpawnedChild): string =>
	child.agentRole === undefined ? "" : ` as ${child.agentRole}`;

// why: the canary. A thread codex names as this session's delegated work that
// the live path never admitted is what a lane quietly dropping delegated frames
// looks like from here, and the census is the only place it shows up at all —
// so the detail says plainly what was missed.
const missed = (child: SpawnedChild): AgentEvent => ({
	detail: `codex names this thread a descendant this session spawned${cast(child)}, and the stream never carried it`,
	gapKind: "census-missing",
	origin: { node: child.threadId, spawnedBy: child.threadId },
	raw: rawOf(SWEEP, child),
	type: "subsession.gap",
});

// why: a child the sweep proves and the record never admitted is admitted now,
// on the provider's own word for where it belongs. It is not ended: a codex
// child is re-driven across activations, and saying it stopped would be a guess
// this census cannot make.
export const censusEvents = (
	admitted: (threadId: string) => boolean,
	sweep: CensusSweep,
): ReadonlyArray<AgentEvent> =>
	sweep
		.filter((child) => !admitted(child.threadId))
		.flatMap((child) => [opening(child), missed(child)]);
