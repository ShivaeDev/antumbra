import type { BoardEntryView, BoardTarget } from "@antumbra/contract";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Badge } from "#components/ui/badge.tsx";
import { cn } from "#lib/utils.ts";
import { BoardComposer } from "#views/board-composer.tsx";
import { MarkdownView } from "#views/markdown-view.tsx";
import { Section } from "#views/section.tsx";
import { authorLabel, boardRegisterLabel, whenLabel } from "#voyages/labels.ts";
import { bySalience } from "#voyages/order.ts";

const EntryRow = ({ entry }: { readonly entry: BoardEntryView }) => {
	const smooth = entry.register === "smooth";
	return (
		<li className={cn("flex min-w-0 flex-col gap-1 rounded-md border px-2.5 py-2", smooth ? "border-border bg-card" : "border-transparent")}>
			<div className="flex min-w-0 items-center gap-2 text-2xs text-muted-foreground">
				<Badge variant={smooth ? "info" : "outline"}>{boardRegisterLabel[entry.register]}</Badge>
				<span className={cn("min-w-0 truncate", entry.authorAgentId === null ? null : "font-mono")}>{authorLabel(entry.authorAgentId)}</span>
				<span className="ml-auto shrink-0 tabular-nums">{whenLabel(entry.createdAt)}</span>
			</div>
			<MarkdownView className={smooth ? "text-xs" : "text-2xs text-muted-foreground"} markdown={entry.body} />
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
}) => {
	const [open, setOpen] = useState(false);
	const Chevron = open ? ChevronDown : ChevronRight;
	return (
		<Section>
			<button
				aria-expanded={open}
				className="flex min-w-0 items-center gap-2 border-b border-border pb-1.5 text-left outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
				onClick={() => setOpen(!open)}
				title={open ? "Hide the board" : "Show the board"}
				type="button"
			>
				<Chevron className="size-3 shrink-0 text-muted-foreground" />
				<span className="min-w-0 truncate text-xs font-medium">Board</span>
				<span className="text-2xs text-muted-foreground tabular-nums">{entries.length}</span>
			</button>
			{open && entries.length === 0 ? <p className="text-2xs text-muted-foreground">Nothing written yet — the crew and you both write here</p> : null}
			{open && entries.length > 0 ? (
				<ul className="flex min-w-0 flex-col gap-1">
					{bySalience(entries).map((entry) => (
						<EntryRow entry={entry} key={entry.id} />
					))}
				</ul>
			) : null}
			{open ? <BoardComposer onError={onError} scope={scope} /> : null}
		</Section>
	);
};
