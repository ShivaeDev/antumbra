import type { TranscriptRaw as RawItem } from "#transcript/model.ts";
import { summaryLine } from "#transcript/summary.ts";
import { Disclosure } from "#views/transcript-disclosure.tsx";
import { Payload } from "#views/transcript-payload.tsx";

export const TranscriptRaw = ({ item }: { readonly item: RawItem }) => (
	<Disclosure
		body={<Payload label="Payload" text={item.payload} />}
		name={<span className="shrink-0 font-mono text-2xs text-muted-foreground">{item.label}</span>}
		subject="this payload"
		summary={summaryLine(item.payload)}
	/>
);
