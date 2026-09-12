import type { SessionId } from "@antumbra/domain-sessions/ids.ts";
import type { transcriptSources } from "@antumbra/domain-sessions/queries/transcript.ts";
import type { TranscriptReading } from "@antumbra/domain-sessions/queries/transcript-rpc.ts";
import type { session } from "@antumbra/domain-sessions/rows/session.ts";
import { Effect } from "effect";
import { sessionActivity } from "#transcript/activity.ts";
import { deriveTranscript } from "#transcript/derive.ts";
import { subsessionDisplayName } from "#transcript/nodes.ts";
import { readLog } from "#transcript/read-log.ts";
import { sessionStanding } from "#transcript/standing.ts";
import type { SessionTreeNode } from "#transcript/types.ts";

const presence = (selected: typeof session.Row.Type | undefined) => {
	if (selected?.status === "closed") return "ended";
	if (selected?.attached) return selected.executionStatus === "idle" ? "idle" : "working";
	return selected?.executionStatus === "active" ? "stranded" : "asleep";
};

export const snapshot = Effect.fn("Transcript.snapshot")(function* (sources: typeof transcriptSources.output.Type, id: SessionId) {
	const logs = [...new Set(sources.references.map((reference) => reference.logId))];
	const parts = yield* Effect.forEach(logs, (logId) =>
		readLog(
			logId,
			sources.references.filter((reference) => reference.logId === logId),
		),
	);
	const events = parts.flatMap((part) => part.events).toSorted((a, b) => a.seq - b.seq);
	const nodes: SessionTreeNode[] = sources.nodes.map((node) => ({
		id: node.id,
		nativeRef: node.nativeRef,
		displayName: subsessionDisplayName(node),
		depth: node.parentSessionId === null ? 0 : 1,
		status: node.status,
	}));
	const node = nodes.find((node) => node.id === id);
	const standing = sessionStanding(events, node);
	return {
		items: deriveTranscript(events, nodes),
		standing,
		activity: sessionActivity(standing, node, presence(sources.nodes.find((node) => node.id === id))),
		unavailable: parts.flatMap((part) => part.unavailable),
	} satisfies typeof TranscriptReading.Type;
});
