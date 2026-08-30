import { Badge } from "#components/ui/badge.tsx";
import type { TranscriptTool as ToolItem } from "#transcript/model.ts";
import { summaryLine } from "#transcript/summary.ts";
import { toolFields } from "#transcript/tool-input.ts";
import { Disclosure } from "#views/transcript-disclosure.tsx";
import { Payload } from "#views/transcript-payload.tsx";

const state = (item: ToolItem): React.ReactNode => {
	if (item.ok === false) {
		return <Badge variant="destructive">failed</Badge>;
	}
	return item.result === undefined ? <span className="shrink-0 text-2xs text-muted-foreground">running</span> : null;
};

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

export const TranscriptTool = ({ item }: { readonly item: ToolItem }) => {
	return (
		<Disclosure
			body={
				<>
					{item.providerName === undefined ? null : <Payload label="Called as" text={item.providerName} />}
					<Input item={item} />
					{item.result === undefined ? null : <Payload label="Result" text={item.result} />}
				</>
			}
			name={<span className="shrink-0 font-medium">{item.name}</span>}
			subject="this call"
			summary={summaryLine(item.input)}
			trailing={state(item)}
		/>
	);
};
