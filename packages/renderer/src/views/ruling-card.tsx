import type { RulingSubjectView, RulingView } from "@antumbra/contract";
import { useState } from "react";
import { Badge } from "#components/ui/badge.tsx";
import { rulingAskedLabel, rulingGatedPieceLabel, rulingRequesterId, rulingSubjectLabel } from "#rulings/labels.ts";
import { MarkdownView } from "#views/markdown-view.tsx";
import { RulingAside } from "#views/ruling-aside.tsx";
import { RulingContexts } from "#views/ruling-contexts.tsx";
import { RulingReclassifications } from "#views/ruling-reclassifications.tsx";
import { OfferedChoices, RulingVerdict } from "#views/ruling-verdict.tsx";
import { RulingWaits } from "#views/ruling-waits.tsx";
import { whenLabel } from "#voyages/labels.ts";

const topical = (subject: RulingSubjectView): boolean => subject.kind === "repo" || subject.kind === "tag";

export const RulingCard = ({ onError, ruling }: { readonly onError: (message: string) => void; readonly ruling: RulingView }) => {
	const [chosen, setChosen] = useState<string | undefined>(undefined);
	const topics = ruling.subjects.filter(topical);
	return (
		<li className="flex min-w-0 flex-col gap-2 rounded-md border border-border bg-card px-3 py-2.5">
			<h3 className="min-w-0 max-w-prose text-sm font-medium">{ruling.question}</h3>
			<p className="min-w-0 max-w-prose text-2xs text-muted-foreground" title={rulingRequesterId(ruling.requester)}>
				{rulingAskedLabel(ruling)}
			</p>
			<RulingWaits ruling={ruling} />
			{ruling.gatedPieces.length === 0 ? null : (
				<p className="min-w-0 max-w-prose text-2xs text-muted-foreground">Unblocks: {ruling.gatedPieces.map(rulingGatedPieceLabel).join(", ")}</p>
			)}
			<RulingReclassifications reclassifications={ruling.reclassifications} />
			{topics.length === 0 ? null : (
				<div className="flex min-w-0 flex-wrap items-center gap-1">
					{topics.map((subject) => (
						<Badge key={`${subject.kind}:${subject.id}`} variant="secondary">
							{rulingSubjectLabel[subject.kind]}: {subject.label}
						</Badge>
					))}
				</div>
			)}
			<OfferedChoices chosen={chosen} onPick={setChosen} ruling={ruling} />
			<MarkdownView className="max-w-prose text-xs text-muted-foreground" markdown={ruling.context} />
			<RulingContexts contexts={ruling.contexts} />
			{ruling.parked === null ? null : (
				<p className="min-w-0 max-w-prose text-2xs text-muted-foreground">
					Not now, {whenLabel(ruling.parked.at)}: {ruling.parked.note}
				</p>
			)}
			<RulingVerdict chosen={chosen} onError={onError} ruling={ruling} />
			<RulingAside onError={onError} ruling={ruling} />
		</li>
	);
};
