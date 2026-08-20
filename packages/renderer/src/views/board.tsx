import type { BoardEntryView, BoardTarget } from "@antumbra/contract";
import { Badge } from "#components/ui/badge.tsx";
import { cn } from "#lib/utils.ts";
import { BoardComposer } from "#views/board-composer.tsx";
import { Section, SectionHeading } from "#views/section.tsx";
import { authorLabel, boardRegisterLabel, whenLabel } from "#voyages/labels.ts";
import { bySalience } from "#voyages/order.ts";

// why: the smooth log is what the voyage wants its readers told and the rough
// log is the scratch behind it, so the smooth entries sit on a card and the
// rough ones recede to bare text rather than competing for the same weight.
const EntryRow = ({ entry }: { readonly entry: BoardEntryView }) => {
	const smooth = entry.register === "smooth";
	return (
		<li
			className={cn(
				"flex min-w-0 flex-col gap-1 rounded-md border px-2.5 py-2",
				smooth ? "border-border bg-card" : "border-transparent",
			)}
		>
			<div className="flex min-w-0 items-center gap-2 text-2xs text-muted-foreground">
				<Badge variant={smooth ? "info" : "outline"}>
					{boardRegisterLabel[entry.register]}
				</Badge>
				<span
					className={cn(
						"min-w-0 truncate",
						entry.authorAgentId === null ? null : "font-mono",
					)}
				>
					{authorLabel(entry.authorAgentId)}
				</span>
				<span className="ml-auto shrink-0 tabular-nums">
					{whenLabel(entry.createdAt)}
				</span>
			</div>
			<p
				className={cn(
					"min-w-0 whitespace-pre-wrap wrap-anywhere",
					smooth ? "text-xs" : "text-2xs text-muted-foreground",
				)}
			>
				{entry.body}
			</p>
		</li>
	);
};

export const BoardPanel = ({
	entries,
	onError,
	scope,
}: {
	readonly entries: ReadonlyArray<BoardEntryView>;
	readonly onError: (message: string) => void;
	readonly scope: BoardTarget;
}) => (
	<Section>
		<SectionHeading count={entries.length} title="Board" />
		{entries.length === 0 ? (
			<p className="text-2xs text-muted-foreground">
				Nothing written yet — the crew and you both write here
			</p>
		) : (
			<ul className="flex min-w-0 flex-col gap-1">
				{bySalience(entries).map((entry) => (
					<EntryRow entry={entry} key={entry.id} />
				))}
			</ul>
		)}
		<BoardComposer onError={onError} scope={scope} />
	</Section>
);
