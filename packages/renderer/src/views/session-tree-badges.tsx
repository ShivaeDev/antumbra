import type { SessionTreeNode } from "@antumbra/contract";
import { Badge } from "#components/ui/badge.tsx";
import { outcomeWords } from "#views/session-outcome-words.ts";

type Variant = React.ComponentProps<typeof Badge>["variant"];
type Outcome = NonNullable<SessionTreeNode["outcome"]>;
type Completeness = SessionTreeNode["completeness"];

// why: every chip below wears English rather than the word the record stores.
// The stored vocabulary is a durable fact about the node, not a label, and a
// reader who has never seen the schema should still be able to read a row.

// why: an ending carries the provider's own word for how work stopped, and the
// colour follows the meaning of that word rather than the fact of it ending. A
// provider word this vocabulary has no counterpart for arrived as "unknown"
// long before it was stored, so it is worn untinted rather than sorted into a
// neighbour it might not belong to.
const OUTCOMES: Record<Outcome, Variant> = {
	completed: "success",
	failed: "destructive",
	interrupted: "warning",
	unknown: "outline",
};

export const OutcomeBadge = ({
	outcome,
}: {
	readonly outcome: SessionTreeNode["outcome"];
}) =>
	outcome === null ? null : (
		<Badge variant={OUTCOMES[outcome]}>{outcomeWords[outcome]}</Badge>
	);

// why: completeness is a statement about the record, not about the work, so it
// is worn quietly. Only "incomplete" is tinted — it is the one state that says
// something is missing. "unaudited" says only that nothing ever looked, and
// looks like it.
const COMPLETENESS: Record<Completeness, Variant> = {
	complete: "secondary",
	incomplete: "warning",
	recording: "outline",
	unaudited: "outline",
};

const COMPLETENESS_WORDS: Record<Completeness, string> = {
	complete: "Nothing missing",
	incomplete: "Parts missing",
	recording: "Not settled yet",
	unaudited: "Never checked",
};

export const CompletenessBadge = ({
	completeness,
}: {
	readonly completeness: Completeness;
}) => (
	<Badge variant={COMPLETENESS[completeness]}>
		{COMPLETENESS_WORDS[completeness]}
	</Badge>
);

// why: only an open node wears this chip. A closed one already says how it
// ended beside it, and a second chip repeating that spends the reader's
// attention on nothing.
export const StatusBadge = ({
	status,
}: {
	readonly status: SessionTreeNode["status"];
}) => (status === "open" ? <Badge variant="outline">Still open</Badge> : null);
