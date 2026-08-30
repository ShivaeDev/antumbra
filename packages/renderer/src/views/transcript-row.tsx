import { Separator } from "#components/ui/separator.tsx";
import type { FoldedItem } from "#transcript/fold.ts";
import type { TranscriptNotice } from "#transcript/model.ts";
import { TranscriptDelegationMark } from "#views/transcript-delegation.tsx";
import { TranscriptGutter } from "#views/transcript-gutter.tsx";
import { TranscriptMessage, TranscriptThought } from "#views/transcript-message.tsx";
import { TranscriptRaw } from "#views/transcript-raw.tsx";
import { TranscriptTool } from "#views/transcript-tool.tsx";
import { TranscriptToolRunRow } from "#views/transcript-tool-run.tsx";

const Telemetry = ({ label }: { readonly label: string }) => (
	<div className="flex items-center gap-2 py-1">
		<Separator className="flex-1" />
		<span className="shrink-0 text-2xs text-muted-foreground">{label}</span>
		<Separator className="flex-1" />
	</div>
);

const Notice = ({ item }: { readonly item: TranscriptNotice }) => (
	<div className="min-w-0 text-2xs text-muted-foreground">
		<p>{item.title}</p>
		{item.detail === undefined ? null : <p className="text-muted-foreground/80">{item.detail}</p>}
	</div>
);

export const TranscriptRow = ({
	item,
	live = true,
	onOpenNode,
	sessionId = "",
}: {
	readonly item: FoldedItem;
	readonly live?: boolean | undefined;
	readonly onOpenNode?: ((nodeId: string) => void) | undefined;
	readonly sessionId?: string | undefined;
}) => {
	if (item.kind === "message") {
		return (
			<TranscriptGutter label={item.role}>
				<TranscriptMessage item={item} sessionId={sessionId} />
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
	if (item.kind === "delegation") {
		return <TranscriptDelegationMark item={item} onOpenNode={onOpenNode} />;
	}
	if (item.kind === "notice") {
		return (
			<TranscriptGutter label="gap">
				<Notice item={item} />
			</TranscriptGutter>
		);
	}
	if (item.kind === "telemetry") {
		return <Telemetry label={item.label} />;
	}
	return (
		<TranscriptGutter label="raw">
			<TranscriptRaw item={item} />
		</TranscriptGutter>
	);
};
