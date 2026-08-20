import type { QuayView } from "@antumbra/contract";
import { Button } from "#components/ui/button.tsx";
import { groupCounts, groupTitle, type QuayFilter } from "#quay/groups.ts";

const Chip = ({
	chosen,
	count,
	label,
	onPick,
}: {
	readonly chosen: boolean;
	readonly count: number;
	readonly label: string;
	readonly onPick: () => void;
}) => (
	<Button
		aria-pressed={chosen}
		onClick={onPick}
		size="sm"
		variant={chosen ? "secondary" : "ghost"}
	>
		{label}
		<span className="text-muted-foreground">{count}</span>
	</Button>
);

// why: with one rung standing there is nothing to narrow to, and a row of
// chips that only ever says the same thing is a control the reader has to
// read past.
export const QuayFilterBar = ({
	onOnly,
	only,
	view,
}: {
	readonly onOnly: (only: QuayFilter) => void;
	readonly only: QuayFilter;
	readonly view: QuayView;
}) => {
	const counts = groupCounts(view);
	if (counts.length < 2) {
		return null;
	}
	return (
		<div className="flex flex-wrap items-center gap-1">
			<Chip
				chosen={only === "all"}
				count={view.rows.length}
				label="Everything"
				onPick={() => onOnly("all")}
			/>
			{counts.map((counted) => (
				<Chip
					chosen={only === counted.group}
					count={counted.count}
					key={counted.group}
					label={groupTitle[counted.group]}
					onPick={() => onOnly(counted.group)}
				/>
			))}
		</div>
	);
};
