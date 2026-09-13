import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@antumbra/glass-components/shadcn/collapsible.tsx";
import { ChevronRightIcon } from "lucide-react";
import type { TranscriptRawRun } from "#transcript/fold.ts";
import { TranscriptRaw } from "#views/transcript-raw.tsx";

const words = (count: number): string => (count === 1 ? "1 raw event" : `${count} raw events`);

export const TranscriptRawRunRow = ({ run }: { readonly run: TranscriptRawRun }) => (
	<Collapsible className="min-w-0">
		<CollapsibleTrigger className="group flex min-w-0 items-center gap-1 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60">
			<ChevronRightIcon className="size-4 shrink-0 group-data-[state=open]:rotate-90" />
			{run.source} · {words(run.entries.length)}
		</CollapsibleTrigger>
		<CollapsibleContent className="flex min-w-0 flex-col gap-3 pt-3">
			{run.entries.map((item) => (
				<TranscriptRaw item={item} key={item.seq} />
			))}
		</CollapsibleContent>
	</Collapsible>
);
