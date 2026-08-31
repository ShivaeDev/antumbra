import type { SessionStoreEntry } from "@anthropic-ai/claude-agent-sdk";
import type { AgentEvent, Origin } from "@antumbra/vocabulary/session-events";
import { blockEvent, contentBlocks } from "#blocks.ts";
import { claudeRaw } from "#raw-payload.ts";

const WORKFLOW_TOOL = "Workflow";

const idAt = (block: Record<string, unknown>, field: string) => (typeof block[field] === "string" ? block[field] : undefined);

const isWorkflowCall = (block: Record<string, unknown>) => block.type === "tool_use" && block.name === WORKFLOW_TOOL;

interface WorkflowResults {
	readonly recovered: (entries: ReadonlyArray<SessionStoreEntry>, origin: Origin | undefined) => ReadonlyArray<AgentEvent>;
}

// why: what a workflow finally returned is written to the transcript of the
// session that called it and never forwarded on the stream, so the mirror is
// the only place it can be read back. Nothing else is taken from these
// transcripts — the stream already carried them, and reading them twice would
// write every turn into the log a second time.
export const openWorkflowResults = (): WorkflowResults => {
	const calls = new Set<string>();
	const reported = new Set<string>();
	const resultEvent = (entry: SessionStoreEntry, block: Record<string, unknown>, origin: Origin | undefined): ReadonlyArray<AgentEvent> => {
		const call = idAt(block, "tool_use_id");
		if (call === undefined || !calls.has(call) || reported.has(call)) {
			return [];
		}
		reported.add(call);
		const raw = claudeRaw(`transcript/${entry.type}`, entry);
		const event = blockEvent(raw, "user", block, origin);
		return event === undefined ? [] : [event];
	};
	const blockEvents = (entry: SessionStoreEntry, origin: Origin | undefined): ReadonlyArray<AgentEvent> =>
		contentBlocks(entry).flatMap((block) => {
			const call = idAt(block, "id");
			if (isWorkflowCall(block) && call !== undefined) {
				calls.add(call);
				return [];
			}
			return block.type === "tool_result" ? resultEvent(entry, block, origin) : [];
		});
	return {
		recovered: (entries, origin) => entries.flatMap((entry) => blockEvents(entry, origin)),
	};
};
