import type { VoyageSummary } from "@antumbra/contract";
import { Badge } from "#components/ui/badge.tsx";
import { Card } from "#components/ui/card.tsx";
import { cn } from "#lib/utils.ts";
import { CaptainCall, FocusToggle } from "#views/voyage-acts.tsx";
import { VoyageProgress } from "#views/voyage-progress.tsx";
import { voyageStateLabel } from "#voyages/labels.ts";
import { voyageTone } from "#voyages/tone.ts";

const VoyageRow = ({
	onError,
	onSelect,
	selected,
	voyage,
}: {
	readonly onError: (message: string) => void;
	readonly onSelect: (voyageId: string) => void;
	readonly selected: string | undefined;
	readonly voyage: VoyageSummary;
}) => {
	const current = voyage.id === selected;
	return (
		<li className="min-w-0">
			<Card
				className={cn(
					"gap-2 transition-colors",
					current
						? "border-border-strong bg-accent"
						: "hover:border-border-strong",
				)}
			>
				<div className="flex min-w-0 items-start gap-1.5">
					{/* why: a voyage is known by its whole name, so a long one wraps
					inside the column instead of ending in an ellipsis the reader has
					to hover to undo. */}
					<button
						aria-current={current ? "true" : undefined}
						className="min-w-0 flex-1 rounded-sm text-left text-xs font-medium wrap-anywhere outline-none"
						onClick={() => onSelect(voyage.id)}
						type="button"
					>
						{voyage.name}
					</button>
					<Badge variant={voyageTone[voyage.state]}>
						{voyageStateLabel[voyage.state]}
					</Badge>
					<FocusToggle onError={onError} voyage={voyage} />
				</div>
				<p className="min-w-0 text-2xs text-muted-foreground wrap-anywhere">
					{voyage.northStar}
				</p>
				<VoyageProgress counts={voyage.counts} />
				<CaptainCall
					captain={voyage.captain}
					onError={onError}
					voyageId={voyage.id}
				/>
			</Card>
		</li>
	);
};

export const VoyagesPanel = ({
	onError,
	onSelect,
	selected,
	voyages,
}: {
	readonly onError: (message: string) => void;
	readonly onSelect: (voyageId: string) => void;
	readonly selected: string | undefined;
	readonly voyages: ReadonlyArray<VoyageSummary>;
}) => {
	if (voyages.length === 0) {
		return (
			<p className="text-2xs text-muted-foreground">
				No voyages open yet — open one to chart work against a north star
			</p>
		);
	}
	return (
		<ul className="flex min-w-0 flex-col gap-1.5">
			{voyages.map((voyage) => (
				<VoyageRow
					key={voyage.id}
					onError={onError}
					onSelect={onSelect}
					selected={selected}
					voyage={voyage}
				/>
			))}
		</ul>
	);
};
