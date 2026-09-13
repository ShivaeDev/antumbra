import type { TranscriptTool as ToolItem } from "@antumbra/domain-sessions/rows/transcript.ts";
import { StatusBadge } from "@antumbra/glass-components/compositions/status-badge.tsx";
import { summaryLine } from "#transcript/summary.ts";
import { toolFields } from "#transcript/tool-input.ts";
import { Disclosure } from "#views/transcript-disclosure.tsx";
import { Payload } from "#views/transcript-payload.tsx";

const state = (item: ToolItem, live: boolean): React.ReactNode => {
	if (item.ok === false) {
		return <StatusBadge state="failed" />;
	}
	if (item.result !== undefined) {
		return null;
	}
	return <span className="shrink-0 text-xs text-muted-foreground">{live ? "running" : "unfinished"}</span>;
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

export const TranscriptTool = ({ item, live }: { readonly item: ToolItem; readonly live: boolean }) => (
	<Disclosure
		body={
			<>
				{item.providerName === undefined ? null : <Payload label="Called as" text={item.providerName} />}
				<Input item={item} />
				{item.result === undefined ? null : <Payload label="Result" text={item.result} />}
			</>
		}
		name={<span className="shrink-0 font-medium">{item.name}</span>}
		summary={summaryLine(item.input)}
		trailing={state(item, live)}
	/>
);
