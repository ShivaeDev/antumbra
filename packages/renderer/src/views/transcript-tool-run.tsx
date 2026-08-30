import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Badge } from "#components/ui/badge.tsx";
import type { TranscriptToolRun } from "#transcript/fold.ts";
import { TranscriptThought } from "#views/transcript-message.tsx";
import { TranscriptTool } from "#views/transcript-tool.tsx";

const tools = (run: TranscriptToolRun) => run.entries.flatMap((entry) => (entry.kind === "tool" ? [entry] : []));

// why: what a folded run was about is the tools it reached for, named once
// each in the order they were first used, so a run of thirty reads as three
// names rather than a line that runs off the edge.
const names = (run: TranscriptToolRun): string => {
	const counts = new Map<string, number>();
	for (const tool of tools(run)) {
		counts.set(tool.name, (counts.get(tool.name) ?? 0) + 1);
	}
	return Array.from(counts, ([name, count]) => (count === 1 ? name : `${name} ×${count}`)).join(", ");
};

// why: a folded run says only what one line can hold, but a call that failed
// or is still out is never something the fold may quietly swallow — those two
// are counted on the line so the reader knows to open it.
const Tail = ({ run }: { readonly run: TranscriptToolRun }) => {
	const called = tools(run);
	const running = called.filter((tool) => tool.result === undefined).length;
	const failed = called.filter((tool) => tool.ok === false).length;
	return (
		<>
			{running === 0 ? null : <span className="shrink-0 text-2xs text-muted-foreground">{running} still running</span>}
			{failed === 0 ? null : <Badge variant="destructive">{failed} failed</Badge>}
		</>
	);
};

// why: the run is a count, not evidence, so it is a line rather than a card.
// Opening it lays the calls out beneath it exactly as they read unfolded,
// which is what makes folding safe to leave on: nothing is summarised away,
// only put behind a click.
export const TranscriptToolRunRow = ({ run }: { readonly run: TranscriptToolRun }) => {
	const [open, setOpen] = useState(false);
	const Chevron = open ? ChevronDown : ChevronRight;
	return (
		<div className="flex min-w-0 flex-col gap-2">
			<button
				aria-expanded={open}
				className="flex w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40"
				onClick={() => setOpen(!open)}
				title={open ? "Hide these calls" : "Show these calls"}
				type="button"
			>
				<Chevron className="size-3 shrink-0 text-muted-foreground" />
				<span className="shrink-0 font-medium">called {tools(run).length} tools</span>
				<span className="min-w-0 flex-1 truncate text-muted-foreground">{names(run)}</span>
				<Tail run={run} />
			</button>
			{open
				? run.entries.map((entry) =>
						entry.kind === "tool" ? <TranscriptTool item={entry} key={entry.seq} /> : <TranscriptThought item={entry} key={entry.seq} />,
					)
				: null}
		</div>
	);
};
