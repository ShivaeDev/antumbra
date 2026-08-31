import type { RulingSubjectView, StandingRulingView } from "@antumbra/contract";
import { Badge } from "#components/ui/badge.tsx";
import { rulingActorLabel, rulingRadiusLabel, rulingSubjectLabel } from "#rulings/labels.ts";
import { RulingSupersede } from "#views/ruling-supersede.tsx";
import { RulingWithdraw } from "#views/ruling-withdraw.tsx";
import { whenLabel } from "#voyages/labels.ts";

const subjectKey = (subject: RulingSubjectView): string => `${subject.kind}:${subject.label}`;

export const StandingRulingCard = ({
	onError,
	others,
	ruling,
}: {
	readonly onError: (message: string) => void;
	readonly others: ReadonlyArray<StandingRulingView>;
	readonly ruling: StandingRulingView;
}) => (
	<li className="flex min-w-0 flex-col gap-2 rounded-md border border-border bg-card px-3 py-2.5">
		<div className="flex min-w-0 flex-wrap items-center gap-2">
			<Badge variant="outline">{rulingRadiusLabel[ruling.radius]}</Badge>
			{ruling.subjects.map((subject) => (
				<Badge key={subjectKey(subject)} variant="secondary">
					{rulingSubjectLabel[subject.kind]}: {subject.label}
				</Badge>
			))}
			<span className="ml-auto shrink-0 text-2xs text-muted-foreground tabular-nums">
				ruled by {rulingActorLabel(ruling.ruledBy, ruling.ruledByAgentId)} {whenLabel(ruling.ruledAt)}
			</span>
		</div>
		<h3 className="min-w-0 text-sm font-medium">{ruling.question}</h3>
		<p className="min-w-0 text-xs">{ruling.answer}</p>
		{ruling.chosen === null ? null : <p className="min-w-0 text-2xs text-muted-foreground">chose: {ruling.chosen}</p>}
		<RulingSupersede onError={onError} others={others} ruling={ruling} />
		<RulingWithdraw onError={onError} ruling={ruling} />
	</li>
);
