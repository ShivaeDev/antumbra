import { AgentSessionCompletenessSchema, AgentSessionStatusSchema } from "@antumbra/vocabulary/agent-runtime";
import { SubsessionOutcome } from "@antumbra/vocabulary/session-events";
import { Schema } from "effect";

export const UNNAMED_SUBSESSION = "Unnamed subsession";

// Provider kinds may be file paths; display the final path stem.
const pathLeaf = (kind: string): string | undefined => {
	if (!kind.includes("/")) {
		return undefined;
	}
	const leaf = kind.slice(kind.lastIndexOf("/") + 1);
	const stem = leaf.includes(".") ? leaf.slice(0, leaf.lastIndexOf(".")) : leaf;
	return stem === "" ? undefined : stem;
};

// Display names are derived from stored opening fields and are not persisted.
export const subsessionDisplayName = (stored: { readonly kind: string | null; readonly label: string | null }): string => {
	if (stored.label !== null && stored.label !== "") {
		return stored.label;
	}
	if (stored.kind === null || stored.kind === "") {
		return UNNAMED_SUBSESSION;
	}
	return pathLeaf(stored.kind) ?? stored.kind;
};

// Depth is derived from the opened tree; providers do not supply it.
export const SessionTreeNode = Schema.Struct({
	completeness: AgentSessionCompletenessSchema,
	depth: Schema.Number,
	displayName: Schema.String,
	id: Schema.String,
	// Provider-owned conversation references join delegation markers to nodes.
	nativeRef: Schema.NullOr(Schema.String),
	// Unknown provider outcomes are not stored as typed endings; null means no ending.
	outcome: Schema.NullOr(SubsessionOutcome),
	status: AgentSessionStatusSchema,
});
export type SessionTreeNode = typeof SessionTreeNode.Type;

export const SessionTree = Schema.Struct({
	alive: Schema.Number,
	nodes: Schema.Array(SessionTreeNode),
	rootSessionId: Schema.String,
	total: Schema.Number,
});
export type SessionTree = typeof SessionTree.Type;
