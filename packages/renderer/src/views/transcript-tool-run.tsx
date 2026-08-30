import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Badge } from "#components/ui/badge.tsx";
import type { ToolRunEntry, TranscriptToolRun } from "#transcript/fold.ts";
import { TranscriptGutter } from "#views/transcript-gutter.tsx";
import { TranscriptThought } from "#views/transcript-message.tsx";
import { TranscriptTool } from "#views/transcript-tool.tsx";

const tools = (run: TranscriptToolRun) => run.entries.flatMap((entry) => (entry.kind === "tool" ? [entry] : []));

const names = (run: TranscriptToolRun): string => {
	const counts = new Map<string, number>();
	for (const tool of tools(run)) {
		counts.set(tool.name, (counts.get(tool.name) ?? 0) + 1);
	}
	return Array.from(counts, ([name, count]) => (count === 1 ? name : `${name} ×${count}`)).join(", ");
};

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

const RunEntry = ({ entry }: { readonly entry: ToolRunEntry }) =>
	entry.kind === "tool" ? (
		<TranscriptGutter label="tool">
			<TranscriptTool item={entry} />
		</TranscriptGutter>
	) : (
		<TranscriptGutter label="thinking">
			<TranscriptThought item={entry} />
		</TranscriptGutter>
	);

export const TranscriptToolRunRow = ({ run }: { readonly run: TranscriptToolRun }) => {
	const [open, setOpen] = useState(false);
	const Chevron = open ? ChevronDown : ChevronRight;
	return (
		<div className="flex min-w-0 flex-col gap-2">
			<TranscriptGutter label="tools">
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
			</TranscriptGutter>
			{open ? run.entries.map((entry) => <RunEntry entry={entry} key={entry.seq} />) : null}
		</div>
	);
};
