import type { RulingReclassificationView } from "@antumbra/contract";
import { rulingActorLabel } from "#rulings/labels.ts";
import { whenLabel } from "#voyages/labels.ts";

const axes = (
	reclassification: RulingReclassificationView,
): ReadonlyArray<string> => [
	...(reclassification.radius === undefined
		? []
		: [`radius ${reclassification.radius}`]),
	...(reclassification.urgency === undefined
		? []
		: [`urgency ${reclassification.urgency}`]),
];

// why: reclassifying refuses to name no axis at all, so a row that moved
// neither is the other move a rung makes — it passed the question up and left
// what it knew behind. The list says which happened rather than printing an
// empty change.
const moved = (reclassification: RulingReclassificationView): string => {
	const set = axes(reclassification);
	return set.length === 0 ? "passed it up" : `set ${set.join(", ")}`;
};

// why: every reclassification stays readable beside the declaration, so the
// list says who moved which axis, to what, and the words they left beside it.
export const RulingReclassifications = ({
	reclassifications,
}: {
	readonly reclassifications: ReadonlyArray<RulingReclassificationView>;
}) =>
	reclassifications.length === 0 ? null : (
		<ul className="flex min-w-0 flex-col gap-0.5 text-2xs text-muted-foreground">
			{reclassifications.map((reclassification) => (
				<li
					className="flex min-w-0 flex-wrap items-baseline gap-x-1.5"
					key={`${reclassification.at}:${moved(reclassification)}`}
				>
					<span className="min-w-0">
						{rulingActorLabel(reclassification.by, reclassification.byAgentId)}{" "}
						{moved(reclassification)}
						{reclassification.note === undefined
							? null
							: ` — ${reclassification.note}`}
					</span>
					<span className="ml-auto shrink-0 tabular-nums">
						{whenLabel(reclassification.at)}
					</span>
				</li>
			))}
		</ul>
	);
