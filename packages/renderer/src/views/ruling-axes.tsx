import type { RulingView } from "@antumbra/contract";
import { Badge } from "#components/ui/badge.tsx";
import {
	rulingRadiusLabel,
	rulingUrgencyLabel,
	rulingUrgencyTone,
} from "#rulings/labels.ts";

// why: the badges say where the ruling stands now, and the asker's own word
// is shown only where an authority moved it, so a moved axis is never read
// as what was asked for.
const Declared = ({ word }: { readonly word: string }) => (
	<span className="text-2xs text-muted-foreground">declared {word}</span>
);

export const RulingAxes = ({ ruling }: { readonly ruling: RulingView }) => (
	<>
		<Badge variant={rulingUrgencyTone[ruling.urgency]}>
			{rulingUrgencyLabel[ruling.urgency]}
		</Badge>
		{ruling.declared.urgency === ruling.urgency ? null : (
			<Declared word={ruling.declared.urgency} />
		)}
		<Badge variant="outline">{rulingRadiusLabel[ruling.radius]}</Badge>
		{ruling.declared.radius === ruling.radius ? null : (
			<Declared word={ruling.declared.radius} />
		)}
	</>
);
