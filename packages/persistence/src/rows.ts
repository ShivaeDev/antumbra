import type { FieldOutputTypes } from "#contract.d.ts";

// why: readers across the domain project stored rows into their own shapes. A
// re-declared shape drifts silently when a column is renamed or its nullability
// changes; a shape derived from the contract turns the same change into a
// compile error at every reader that cares.
export type StoredAgentSession =
	FieldOutputTypes["__unbound__"]["AgentSession"];
