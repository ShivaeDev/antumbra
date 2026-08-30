import type { SessionMessage } from "@anthropic-ai/claude-agent-sdk";
import { censusFindings, transcriptFindings } from "@antumbra/backend-claude";
import { type CensusSweep, censusOf, censusUnreadable } from "@antumbra/backend-codex";
import type { SessionAudit } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { NATIVE_ROOT } from "#test/session-frames.ts";

// why: what the provider kept beside the stream, scripted. The readings are the
// live ones — the uuid diff, the directory census, the sweep of every thread
// spawned below the root — and only the answer they read is written by hand, so
// a rehearsal says what an audit concludes without a provider on disk to
// conclude it from.
export type StoredTranscripts = ReadonlyMap<string, ReadonlyArray<SessionMessage>>;

export const storedNothing: StoredTranscripts = new Map();

export const storedLine = (uuid: string, body: string, parentToolUseId: string | null): SessionMessage => ({
	message: {
		content: [{ citations: null, text: body, type: "text" }],
		role: "assistant",
	},
	parent_agent_id: null,
	parent_tool_use_id: parentToolUseId,
	session_id: NATIVE_ROOT,
	type: "assistant",
	uuid,
});

export const scriptedClaudeAudit = (stored: StoredTranscripts): SessionAudit => ({
	census: (request) =>
		Effect.succeed({
			events: censusFindings([...stored].filter(([agentId]) => !request.admitted(agentId)).map(([agentId, messages]) => ({ agentId, messages }))),
			nodes: [],
		}),
	node: (request) => Effect.map(request.recorded, (recorded) => transcriptFindings(request.nodeRef, stored.get(request.nodeRef) ?? [], recorded)),
});

// why: the sweep answered and named no thread the record has not got — a
// session whose delegated work the stream carried in full.
export const sweptClean: CensusSweep = [];

// why: the sweep that could not be taken at all. The live lane keeps that state
// in the error channel of the request; a rehearsal has no request to fail, so it
// names the state instead — and names it rather than passing `undefined`, which
// a default argument would quietly turn back into an answer.
export const SWEEP_REFUSED = "refused";
export type ScriptedSweep = CensusSweep | typeof SWEEP_REFUSED;

const REFUSED = "the app-server could not be reached";

export const scriptedCodexAudit = (sweep: ScriptedSweep): SessionAudit => ({
	census: (request) => Effect.succeed(sweep === SWEEP_REFUSED ? censusUnreadable(request.rootRef, REFUSED) : censusOf(request.admitted, sweep)),
	node: () => Effect.succeed([]),
});
