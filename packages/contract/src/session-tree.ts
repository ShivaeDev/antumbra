import {
	AgentSessionCompletenessSchema,
	AgentSessionStatusSchema,
} from "@antumbra/vocabulary/agent-runtime";
import { Schema } from "effect";

// why: what a delegated conversation is called when nothing named it. The
// words live here rather than in the projection because a view that meets a
// delegation marker its tree does not hold has to reach the same fallback —
// two implementations of one rule drift, and the drift shows as one node
// wearing two names.
export const UNNAMED_SUBSESSION = "Unnamed Subagent";

// why: a provider that names an agent by the file defining it stored a path,
// not a name. The leaf without its extension is the name that path was already
// carrying; anything further would be Antumbra naming a node the provider left
// unnamed.
const pathLeaf = (kind: string): string | undefined => {
	if (!kind.includes("/")) {
		return undefined;
	}
	const leaf = kind.slice(kind.lastIndexOf("/") + 1);
	const stem = leaf.includes(".") ? leaf.slice(0, leaf.lastIndexOf(".")) : leaf;
	return stem === "" ? undefined : stem;
};

// why: computed at read from what was stored when the node opened, never
// written back — a name the record was never given is not a fact about the
// node, and persisting one would make the display rule unfalsifiable later.
export const subsessionDisplayName = (stored: {
	readonly kind: string | null;
	readonly label: string | null;
}): string => {
	if (stored.label !== null && stored.label !== "") {
		return stored.label;
	}
	if (stored.kind === null || stored.kind === "") {
		return UNNAMED_SUBSESSION;
	}
	return pathLeaf(stored.kind) ?? stored.kind;
};

// why: depth is what the walk found, not what any frame claimed — a provider
// never says how deep it is, and an event that did say would be describing the
// tree from inside it.
export const SessionTreeNode = Schema.Struct({
	completeness: AgentSessionCompletenessSchema,
	depth: Schema.Number,
	displayName: Schema.String,
	id: Schema.String,
	// why: the provider's own reference for this conversation, which is what a
	// delegation marker in a parent's transcript names. It is the join between
	// what the transcript says and which node it points at.
	nativeRef: Schema.NullOr(Schema.String),
	outcome: Schema.NullOr(Schema.String),
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
