import type { RulingView } from "@antumbra/contract";
import { Badge } from "#components/ui/badge.tsx";
import { rulingUrgencyLabel, rulingUrgencyTone, rulingWaitsLabel } from "#rulings/labels.ts";

const Declared = ({ word }: { readonly word: string }) => <span className="text-2xs text-muted-foreground">declared {word}</span>;

export const RulingWaits = ({ ruling }: { readonly ruling: RulingView }) => (
	<p className="flex min-w-0 max-w-prose flex-wrap items-center gap-x-1.5 gap-y-1 text-2xs text-muted-foreground">
		<Badge variant={rulingUrgencyTone[ruling.urgency]}>{rulingUrgencyLabel[ruling.urgency]}</Badge>
		<span className="min-w-0">{rulingWaitsLabel(ruling)}</span>
		{ruling.declared.urgency === ruling.urgency ? null : <Declared word={ruling.declared.urgency} />}
		{ruling.declared.radius === ruling.radius ? null : <Declared word={ruling.declared.radius} />}
	</p>
);
