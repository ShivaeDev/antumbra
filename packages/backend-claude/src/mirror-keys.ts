import type { SessionKey } from "@anthropic-ai/claude-agent-sdk";

const SUBAGENTS = "subagents";
const WORKFLOWS = "workflows";
const AGENT = "agent-";

export interface WorkflowAgentRef {
	readonly agentId: string;
	readonly runId: string;
}

const agentIdOf = (segment = ""): string | undefined => (segment.startsWith(AGENT) ? segment.slice(AGENT.length) : undefined);

// why: the provider mirrors each workflow agent's transcript under a storage
// key that already names the run and the agent, so the key is the whole join —
// nothing has to be correlated out of the bytes it carries. Depth below the run
// is not asserted: an agent that delegates further nests its own directory, and
// a key this lane failed to recognise would be a transcript nothing reads.
export const workflowAgentRef = (key: SessionKey): WorkflowAgentRef | undefined => {
	const segments = key.subpath?.split("/") ?? [];
	const [scope, kind, runId] = segments;
	if (scope !== SUBAGENTS || kind !== WORKFLOWS || runId === undefined) {
		return undefined;
	}
	const agentId = agentIdOf(segments.at(-1));
	return agentId === undefined || segments.length < 4 ? undefined : { agentId, runId };
};

// why: a delegated agent the stream already announced mirrors its transcript
// beside the run directories rather than inside one. This lane never re-reads
// that transcript — the stream carried it — but a key that names a node is how
// a result recovered from it is attributed back to that node.
export const subagentRef = (key: SessionKey): string | undefined => {
	const segments = key.subpath?.split("/") ?? [];
	return segments.length >= 2 && segments[0] === SUBAGENTS ? agentIdOf(segments.at(-1)) : undefined;
};

// why: an adopted node whose stored sidecar never named the call that started
// it still has to say what it was spawned by. The key its transcript was read
// from is the provider's own reference to it, and it joins no tool call, so the
// tree reads the node the way it reads any unattributable spawn.
export const agentFileRef = (agentId: string): string => [SUBAGENTS, `${AGENT}${agentId}`].join("/");

// why: a workflow agent whose invoking tool call was never seen is still a node
// of this Session's tree, and its opening needs a reference for what spawned
// it. The run's own key segment is the provider's word for that, and it joins
// no tool call — which is exactly how the tree reads an unattributable spawn:
// the node belongs to the root that owns the stream.
export const workflowRunRef = (runId: string): string => [SUBAGENTS, WORKFLOWS, runId].join("/");
