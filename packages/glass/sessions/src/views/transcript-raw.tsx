import type { TranscriptRaw as RawItem } from "@antumbra/domain-sessions/rows/transcript.ts";

export const TranscriptRaw = ({ item }: { readonly item: RawItem }) => (
	<div className="flex min-w-0 flex-col gap-1">
		<span className="font-mono text-xs text-muted-foreground">{item.label}</span>
		<pre className="max-h-72 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs whitespace-pre-wrap wrap-anywhere">{item.payload}</pre>
	</div>
);
