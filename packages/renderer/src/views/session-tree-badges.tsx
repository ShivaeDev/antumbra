import type { SessionTreeNode } from "@antumbra/contract";
import { Badge } from "#components/ui/badge.tsx";

type Variant = React.ComponentProps<typeof Badge>["variant"];

// why: an ending carries the provider's own word for how work stopped, and the
// colour follows the meaning of that word rather than the fact of it ending. A
// word this vocabulary does not own reads plainly instead of being tinted into
// one it does.
const OUTCOMES: Record<string, Variant> = {
	completed: "success",
	failed: "destructive",
	interrupted: "warning",
};

export const OutcomeBadge = ({
	outcome,
}: {
	readonly outcome: string | null;
}) =>
	outcome === null ? null : (
		<Badge variant={OUTCOMES[outcome] ?? "outline"}>{outcome}</Badge>
	);

// why: completeness is a statement about the record, not about the work, so it
// is worn quietly. Only "incomplete" is tinted — it is the one state that says
// something is missing. "unaudited" asserts nothing and looks like it.
const COMPLETENESS: Record<SessionTreeNode["completeness"], Variant> = {
	complete: "secondary",
	incomplete: "warning",
	recording: "outline",
	unaudited: "outline",
};

export const CompletenessBadge = ({
	completeness,
}: {
	readonly completeness: SessionTreeNode["completeness"];
}) => <Badge variant={COMPLETENESS[completeness]}>{completeness}</Badge>;
