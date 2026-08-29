import type { RulingReclassificationView } from "@antumbra/contract";
import { rulingAuthorityLabel } from "#rulings/labels.ts";
import { whenLabel } from "#voyages/labels.ts";

const moves = (reclassification: RulingReclassificationView): string =>
	[
		reclassification.radius === undefined
			? []
			: [`radius ${reclassification.radius}`],
		reclassification.urgency === undefined
			? []
			: [`urgency ${reclassification.urgency}`],
	]
		.flat()
		.join(", ");

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
					key={`${reclassification.at}:${moves(reclassification)}`}
				>
					<span className="min-w-0">
						{rulingAuthorityLabel[reclassification.by]} set{" "}
						{moves(reclassification)}
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
