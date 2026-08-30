import type { SessionEvent, SessionTreeNode } from "@antumbra/contract";
import { ArrowDown } from "lucide-react";
import { watchSessionEvents } from "#adapters/trpc.ts";
import { Button } from "#components/ui/button.tsx";
import { useFeedLog } from "#hooks/feed.ts";
import { deriveTranscript } from "#transcript/derive.ts";
import { foldToolRuns } from "#transcript/fold.ts";
import { sessionStanding } from "#transcript/standing.ts";
import { SessionStandingBar } from "#views/session-standing.tsx";
import { TranscriptRow } from "#views/transcript-row.tsx";
import { useTail } from "#views/transcript-tail.ts";

export const TranscriptView = ({
	foldToolCalls,
	nodes = [],
	onOpenNode,
	sessionId,
}: {
	readonly foldToolCalls: boolean;
	readonly nodes?: ReadonlyArray<SessionTreeNode> | undefined;
	readonly onOpenNode?: ((nodeId: string) => void) | undefined;
	readonly sessionId: string;
}) => {
	const { error: feedError, value: events } = useFeedLog<SessionEvent>(
		sessionId,
		(onEvent, onError) =>
			watchSessionEvents({ fromSeq: 0, sessionId }, onEvent, onError),
	);
	const derived = deriveTranscript(events, nodes);
	const items = foldToolCalls ? foldToolRuns(derived) : derived;
	const standing = sessionStanding(events);
	const { atTail, onScroll, pane, toTail } = useTail(events.length);

	return (
		<section className="relative flex min-h-0 min-w-0 flex-1 flex-col">
			{feedError === undefined ? null : (
				<div className="shrink-0 border-b border-destructive/40 bg-destructive/10 px-4 py-1.5 text-xs text-destructive">
					feed lost: {feedError}
				</div>
			)}
			<div
				className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-3"
				onScroll={onScroll}
				ref={pane}
			>
				{items.length === 0 ? (
					<p className="text-xs text-muted-foreground">
						no events yet — what this session says and does appears here as it
						works
					</p>
				) : (
					items.map((item, index) => (
						<TranscriptRow
							item={item}
							key={`${item.seq}-${index}`}
							onOpenNode={onOpenNode}
							sessionId={sessionId}
						/>
					))
				)}
			</div>
			{atTail ? null : (
				<Button
					className="absolute right-4 bottom-9 shadow-lg"
					onClick={toTail}
					size="sm"
					variant="secondary"
				>
					<ArrowDown />
					Jump to latest
				</Button>
			)}
			<SessionStandingBar standing={standing} />
		</section>
	);
};
