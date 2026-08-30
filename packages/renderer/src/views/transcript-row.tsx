import { Separator } from "#components/ui/separator.tsx";
import type { FoldedItem } from "#transcript/fold.ts";
import type { TranscriptNotice } from "#transcript/model.ts";
import { TranscriptDelegationMark } from "#views/transcript-delegation.tsx";
import {
	TranscriptMessage,
	TranscriptThought,
} from "#views/transcript-message.tsx";
import { TranscriptRaw } from "#views/transcript-raw.tsx";
import { TranscriptTool } from "#views/transcript-tool.tsx";
import { TranscriptToolRunRow } from "#views/transcript-tool-run.tsx";

// why: every entry is labelled in the same narrow column, so the eye reads
// down one edge to find who is speaking and the content keeps a single left
// margin however it is rendered.
const Gutter = ({
	children,
	label,
}: {
	readonly children: React.ReactNode;
	readonly label: string;
}) => (
	<div className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-3">
		<span className="pt-0.5 text-right text-2xs text-muted-foreground">
			{label}
		</span>
		<div className="min-w-0">{children}</div>
	</div>
);

// why: telemetry is not something anyone said. It reads as the rule between
// two stretches of narration rather than as another entry in the column.
const Telemetry = ({ label }: { readonly label: string }) => (
	<div className="flex items-center gap-2 py-1">
		<Separator className="flex-1" />
		<span className="shrink-0 text-2xs text-muted-foreground">{label}</span>
		<Separator className="flex-1" />
	</div>
);

// why: a gap says what this record did not see. It is set in the same muted
// register as the rest of the margin, because nothing here broke and colouring
// it would send the reader hunting for a fault.
const Notice = ({ item }: { readonly item: TranscriptNotice }) => (
	<div className="min-w-0 text-2xs text-muted-foreground">
		<p>{item.title}</p>
		{item.detail === undefined ? null : (
			<p className="text-muted-foreground/80">{item.detail}</p>
		)}
	</div>
);

export const TranscriptRow = ({
	item,
	onOpenNode,
	sessionId = "",
}: {
	readonly item: FoldedItem;
	readonly onOpenNode?: ((nodeId: string) => void) | undefined;
	readonly sessionId?: string | undefined;
}) => {
	if (item.kind === "message") {
		return (
			<Gutter label={item.role}>
				<TranscriptMessage item={item} sessionId={sessionId} />
			</Gutter>
		);
	}
	if (item.kind === "thinking") {
		return (
			<Gutter label="thinking">
				<TranscriptThought item={item} />
			</Gutter>
		);
	}
	if (item.kind === "tool") {
		return (
			<Gutter label="tool">
				<TranscriptTool item={item} />
			</Gutter>
		);
	}
	if (item.kind === "toolRun") {
		return (
			<Gutter label="tools">
				<TranscriptToolRunRow run={item} />
			</Gutter>
		);
	}
	if (item.kind === "delegation") {
		return <TranscriptDelegationMark item={item} onOpenNode={onOpenNode} />;
	}
	if (item.kind === "notice") {
		return (
			<Gutter label="gap">
				<Notice item={item} />
			</Gutter>
		);
	}
	if (item.kind === "telemetry") {
		return <Telemetry label={item.label} />;
	}
	return (
		<Gutter label="raw">
			<TranscriptRaw item={item} />
		</Gutter>
	);
};
