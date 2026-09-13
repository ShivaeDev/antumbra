import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@antumbra/glass-components/shadcn/collapsible.tsx";
import { ChevronRightIcon } from "lucide-react";
import type { ToolRunEntry, TranscriptToolRun } from "#transcript/fold.ts";
import { TranscriptGutter } from "#views/transcript-gutter.tsx";
import { TranscriptThought } from "#views/transcript-message.tsx";
import { TranscriptTool } from "#views/transcript-tool.tsx";

const tools = (run: TranscriptToolRun) => run.entries.flatMap((entry) => (entry.kind === "tool" ? [entry] : []));

const summary = (run: TranscriptToolRun, live: boolean): string => {
	const called = tools(run);
	const running = called.filter((tool) => tool.result === undefined).length;
	const failed = called.filter((tool) => tool.ok === false).length;
	return [
		`${called.length} tool calls`,
		...(running === 0 ? [] : [`${running} ${live ? "still running" : "unfinished"}`]),
		...(failed === 0 ? [] : [`${failed} failed`]),
	].join(" · ");
};

const RunEntry = ({ entry, live }: { readonly entry: ToolRunEntry; readonly live: boolean }) =>
	entry.kind === "tool" ? (
		<TranscriptGutter label="tool">
			<TranscriptTool item={entry} live={live} />
		</TranscriptGutter>
	) : (
		<TranscriptGutter label="thinking">
			<TranscriptThought item={entry} />
		</TranscriptGutter>
	);

export const TranscriptToolRunRow = ({ live, run }: { readonly live: boolean; readonly run: TranscriptToolRun }) => (
	<Collapsible className="min-w-0">
		<CollapsibleTrigger className="group flex min-w-0 items-center gap-1 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60">
			<ChevronRightIcon className="size-4 shrink-0 group-data-[state=open]:rotate-90" />
			{summary(run, live)}
		</CollapsibleTrigger>
		<CollapsibleContent className="flex min-w-0 flex-col gap-3 pt-3">
			{run.entries.map((entry) => (
				<RunEntry entry={entry} key={entry.seq} live={live} />
			))}
		</CollapsibleContent>
	</Collapsible>
);
