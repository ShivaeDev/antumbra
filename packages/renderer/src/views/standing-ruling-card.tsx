import type { StandingRulingView } from "@antumbra/contract";
import { Badge } from "#components/ui/badge.tsx";
import { rulingActorLabel, rulingRadiusLabel, rulingSubjectLabel } from "#rulings/labels.ts";
import { type RulingAct, RulingActs } from "#views/ruling-acts.tsx";
import { RulingSupersede } from "#views/ruling-supersede.tsx";
import { RulingWithdraw } from "#views/ruling-withdraw.tsx";
import { whenLabel } from "#voyages/labels.ts";

const standingActs = (
	onError: (message: string) => void,
	others: ReadonlyArray<StandingRulingView>,
	ruling: StandingRulingView,
): ReadonlyArray<RulingAct> => [
	...(others.length === 0
		? []
		: [{ act: <RulingSupersede onError={onError} others={others} ruling={ruling} />, words: "Replace with a later ruling" }]),
	{ act: <RulingWithdraw onError={onError} ruling={ruling} />, words: "Take it out of force" },
];

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
		<h3 className="min-w-0 max-w-prose text-sm font-medium">{ruling.question}</h3>
		<p className="min-w-0 max-w-prose text-xs">{ruling.answer}</p>
		<div className="flex min-w-0 flex-wrap items-center gap-2">
			<Badge variant="outline">{rulingRadiusLabel[ruling.radius]}</Badge>
			{ruling.subjects.map((subject) => (
				<Badge key={`${subject.kind}:${subject.id}`} title={subject.id} variant="secondary">
					{rulingSubjectLabel[subject.kind]}: {subject.label}
				</Badge>
			))}
			<span className="ml-auto shrink-0 text-2xs text-muted-foreground tabular-nums" title={ruling.ruledByAgent?.id}>
				ruled by {rulingActorLabel(ruling.ruledBy, ruling.ruledByAgent)} {whenLabel(ruling.ruledAt)}
			</span>
		</div>
		{ruling.chosen === null ? null : <p className="min-w-0 text-2xs text-muted-foreground">chose: {ruling.chosen}</p>}
		<RulingActs acts={standingActs(onError, others, ruling)} />
	</li>
);
