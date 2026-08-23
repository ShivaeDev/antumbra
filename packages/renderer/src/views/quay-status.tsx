import type { QuayGroup } from "@antumbra/contract";
import { Badge } from "#components/ui/badge.tsx";
import type { QuayChange } from "#quay/changes.ts";
import { groupTitle } from "#quay/groups.ts";
import { type ChangeMark, changeMarks } from "#quay/marks.ts";

const MARK_VARIANTS: Readonly<
	Record<
		ChangeMark["tone"],
		"destructive" | "info" | "outline" | "success" | "warning"
	>
> = {
	destructive: "destructive",
	info: "info",
	muted: "outline",
	success: "success",
	warning: "warning",
};

const GROUP_VARIANTS: Readonly<
	Record<QuayGroup, "destructive" | "outline" | "success" | "warning">
> = {
	alongside: "success",
	checksRunning: "warning",
	draft: "outline",
	needsAttention: "destructive",
};

export const QuayStatus = ({ item }: { readonly item: QuayChange }) => (
	<section
		aria-labelledby="quay-status-heading"
		className="flex flex-col gap-2"
	>
		<div className="flex items-center gap-2 border-border border-b pb-1.5">
			<h3 className="text-xs font-medium" id="quay-status-heading">
				Status
			</h3>
			<Badge variant={GROUP_VARIANTS[item.group]}>
				{groupTitle[item.group]}
			</Badge>
		</div>
		<div className="grid gap-2 sm:grid-cols-3">
			{changeMarks(item.change).map((mark) => (
				<div
					className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
					key={mark.key}
				>
					<span className="text-2xs text-muted-foreground">
						{mark.key === "merge" ? "Merge" : mark.key}
					</span>
					<Badge variant={MARK_VARIANTS[mark.tone]}>{mark.label}</Badge>
				</div>
			))}
		</div>
	</section>
);
