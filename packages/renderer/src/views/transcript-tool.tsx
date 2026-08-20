import { Badge } from "#components/ui/badge.tsx";
import type { TranscriptTool as ToolItem } from "#transcript/model.ts";
import { summaryLine } from "#transcript/summary.ts";
import { Disclosure, Payload } from "#views/transcript-disclosure.tsx";

// why: a call that worked is the expected outcome and says so by staying
// quiet. Only a failure or a call still out is worth a word of its own.
const state = (item: ToolItem): React.ReactNode => {
	if (item.ok === false) {
		return <Badge variant="destructive">failed</Badge>;
	}
	return item.result === undefined ? (
		<span className="shrink-0 text-2xs text-muted-foreground">running</span>
	) : null;
};

export const TranscriptTool = ({ item }: { readonly item: ToolItem }) => (
	<Disclosure
		body={
			<>
				<Payload label="input" text={item.input} />
				{item.result === undefined ? null : (
					<Payload label="result" text={item.result} />
				)}
			</>
		}
		name={<span className="shrink-0 font-medium">{item.name}</span>}
		subject="this call"
		summary={summaryLine(item.input)}
		trailing={state(item)}
	/>
);
