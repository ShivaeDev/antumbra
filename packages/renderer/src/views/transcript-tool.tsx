import { Badge } from "#components/ui/badge.tsx";
import type { TranscriptTool as ToolItem } from "#transcript/model.ts";
import { summaryLine } from "#transcript/summary.ts";
import { toolFields } from "#transcript/tool-input.ts";
import { Disclosure } from "#views/transcript-disclosure.tsx";
import { Payload } from "#views/transcript-payload.tsx";

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

// why: an opened call is read to see what was actually run, so each argument
// stands under the name the tool gave it and a command reads as the command
// that was written rather than as the JSON line it travelled in.
const Input = ({ item }: { readonly item: ToolItem }) => {
	const fields = toolFields(item.input);
	if (fields.length === 0) {
		return <Payload label="Input" text={item.input} />;
	}
	return (
		<>
			{fields.map((field) => (
				<Payload key={field.name} label={field.name} text={field.text} />
			))}
		</>
	);
};

export const TranscriptTool = ({ item }: { readonly item: ToolItem }) => (
	<Disclosure
		body={
			<>
				<Input item={item} />
				{item.result === undefined ? null : (
					<Payload label="Result" text={item.result} />
				)}
			</>
		}
		name={<span className="shrink-0 font-medium">{item.name}</span>}
		subject="this call"
		summary={summaryLine(item.input)}
		trailing={state(item)}
	/>
);
