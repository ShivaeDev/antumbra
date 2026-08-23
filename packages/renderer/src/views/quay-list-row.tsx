import type { QuayGroup } from "@antumbra/contract";
import { Badge } from "#components/ui/badge.tsx";
import { cn } from "#lib/utils.ts";
import type { QuayChange } from "#quay/changes.ts";
import { groupTitle } from "#quay/groups.ts";
import { changeNumber } from "#quay/marks.ts";
import { whenLabel } from "#voyages/labels.ts";

const GROUP_VARIANTS: Readonly<
	Record<QuayGroup, "destructive" | "outline" | "success" | "warning">
> = {
	alongside: "success",
	checksRunning: "warning",
	draft: "outline",
	needsAttention: "destructive",
};

const WorkLine = ({ item }: { readonly item: QuayChange }) => {
	if (item.berthings.length > 1) {
		return `${item.berthings.length} linked pieces`;
	}
	const [berthing] = item.berthings;
	return berthing === undefined
		? "No linked work"
		: `${berthing.voyageName} › ${berthing.pieceTitle}`;
};

export const QuayListRow = ({
	current,
	item,
	onSelect,
}: {
	readonly current: boolean;
	readonly item: QuayChange;
	readonly onSelect: (changeId: string) => void;
}) => {
	const number = changeNumber(item.change);
	return (
		<li>
			<button
				aria-current={current ? "true" : undefined}
				className={cn(
					"flex w-full min-w-0 flex-col gap-1.5 rounded-md border px-2.5 py-2 text-left outline-none transition-colors",
					"focus-visible:ring-2 focus-visible:ring-ring/60",
					current
						? "border-border-strong bg-accent"
						: "border-transparent hover:border-border hover:bg-accent/60",
				)}
				onClick={() => onSelect(item.change.id)}
				type="button"
			>
				<span className="flex min-w-0 items-center gap-1.5">
					<span className="min-w-0 flex-1 text-xs font-medium wrap-anywhere">
						{item.change.title}
					</span>
					{number === "" ? null : (
						<span className="font-mono text-2xs text-muted-foreground">
							{number}
						</span>
					)}
				</span>
				<span className="flex min-w-0 items-center gap-1.5">
					<Badge className="max-w-32 truncate font-mono" variant="outline">
						{item.change.repoName}
					</Badge>
					<Badge variant={GROUP_VARIANTS[item.group]}>
						{groupTitle[item.group]}
					</Badge>
					<span className="ml-auto shrink-0 text-2xs text-muted-foreground">
						{whenLabel(item.change.activityAt)}
					</span>
				</span>
				<span className="truncate text-2xs text-muted-foreground">
					<WorkLine item={item} />
				</span>
			</button>
		</li>
	);
};
