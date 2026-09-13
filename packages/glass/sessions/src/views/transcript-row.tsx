import type { TranscriptNotice } from "@antumbra/domain-sessions/rows/transcript.ts";
import { Marker } from "@antumbra/glass-components/compositions/marker.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@antumbra/glass-components/shadcn/tooltip.tsx";
import type { InputsClient } from "@antumbra/glass-inputs/client.ts";
import type { FoldedItem } from "#transcript/fold.ts";
import { TranscriptDelegationMark } from "#views/transcript-delegation.tsx";
import { TranscriptGutter } from "#views/transcript-gutter.tsx";
import { TranscriptMessage, TranscriptThought } from "#views/transcript-message.tsx";
import { TranscriptRawRunRow } from "#views/transcript-raw-run.tsx";
import { TranscriptTool } from "#views/transcript-tool.tsx";
import { TranscriptToolRunRow } from "#views/transcript-tool-run.tsx";

const Telemetry = ({ detail, label }: { readonly detail: string | undefined; readonly label: string }) => (
	<Marker>
		{detail === undefined ? (
			label
		) : (
			<Tooltip>
				<TooltipTrigger asChild>
					<span>{label}</span>
				</TooltipTrigger>
				<TooltipContent>{detail}</TooltipContent>
			</Tooltip>
		)}
	</Marker>
);

const Notice = ({ item }: { readonly item: TranscriptNotice }) => (
	<div className="min-w-0 text-xs text-muted-foreground">
		<p>{item.title}</p>
		{item.detail === undefined ? null : <p>{item.detail}</p>}
	</div>
);

export const TranscriptRow = ({
	inputs,
	item,
	live = true,
	onOpenNode,
	sessionId = "",
}: {
	readonly inputs: InputsClient;
	readonly item: FoldedItem;
	readonly live?: boolean | undefined;
	readonly onOpenNode?: ((nodeId: string) => void) | undefined;
	readonly sessionId?: string | undefined;
}) => {
	if (item.kind === "message") {
		return (
			<TranscriptGutter label={item.role}>
				<TranscriptMessage api={inputs} item={item} sessionId={sessionId} />
			</TranscriptGutter>
		);
	}
	if (item.kind === "thinking") {
		return (
			<TranscriptGutter label="thinking">
				<TranscriptThought item={item} />
			</TranscriptGutter>
		);
	}
	if (item.kind === "tool") {
		return (
			<TranscriptGutter label={item.servedBy === "antumbra" ? "Antumbra" : "tool"}>
				<TranscriptTool item={item} live={live} />
			</TranscriptGutter>
		);
	}
	if (item.kind === "toolRun") {
		return <TranscriptToolRunRow live={live} run={item} />;
	}
	if (item.kind === "rawRun") {
		return <TranscriptRawRunRow run={item} />;
	}
	if (item.kind === "delegation") {
		return <TranscriptDelegationMark item={item} onOpenNode={onOpenNode} />;
	}
	if (item.kind === "notice") {
		return <Notice item={item} />;
	}
	return <Telemetry detail={item.detail} label={item.label} />;
};
