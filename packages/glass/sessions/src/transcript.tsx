import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import type { TranscriptItem } from "@antumbra/domain-sessions/rows/transcript.ts";
import { reading } from "@antumbra/glass-client/live.tsx";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
import type { InputsClient } from "@antumbra/glass-inputs/client.ts";
import { useAtomValue } from "@effect/atom-react";
import * as Atom from "effect/unstable/reactivity/Atom";
import { ArrowDown } from "lucide-react";
import { useMemo } from "react";
import type { SessionsClient } from "#client.ts";
import type { SessionsApi } from "#glass.ts";
import { SessionStandingBar } from "#session-standing.tsx";
import { foldToolRuns } from "#transcript/fold.ts";
import { TranscriptRow } from "#views/transcript-row.tsx";
import { useTail } from "#views/transcript-tail.ts";

export const Transcript = (props: {
	readonly inputs: InputsClient;
	readonly items: ReadonlyArray<TranscriptItem>;
	readonly live: boolean;
	readonly sessionId: string;
	readonly foldToolCalls: boolean;
	readonly onOpenNode?: ((id: string) => void) | undefined;
}) => {
	const items = props.foldToolCalls ? foldToolRuns(props.items) : props.items;
	const tail = useTail(props.items.length);
	return (
		<section className="relative flex min-h-0 min-w-0 flex-1 flex-col">
			<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-3" onScroll={tail.onScroll} ref={tail.pane}>
				{items.length === 0 ? (
					<p className="text-xs text-muted-foreground">no events yet — what this session says and does appears here as it works</p>
				) : (
					items.map((item, index) => (
						<TranscriptRow
							inputs={props.inputs}
							item={item}
							key={`${item.seq}-${index}`}
							live={props.live}
							onOpenNode={props.onOpenNode}
							sessionId={props.sessionId}
						/>
					))
				)}
			</div>
			{tail.atTail ? null : (
				<Button className="absolute right-4 bottom-9 shadow-lg" onClick={tail.toTail} size="sm" variant="secondary">
					<ArrowDown />
					Jump to latest
				</Button>
			)}
		</section>
	);
};

export const TranscriptView = (props: {
	readonly api: SessionsApi;
	readonly sessions: SessionsClient;
	readonly inputs: InputsClient;
	readonly sessionId: string;
	readonly foldToolCalls: boolean;
	readonly onOpenNode?: ((id: string) => void) | undefined;
}) => {
	const atom = useMemo(
		() => Atom.make(props.sessions["sessions.transcript"]({ id: SessionId.make(props.sessionId) })),
		[props.sessions, props.sessionId],
	);
	const result = useAtomValue(atom);
	return reading(result, "Reading transcript…", (snapshot) => (
		<>
			{snapshot.unavailable.map((message) => (
				<p role="alert" key={message} className="border-b border-destructive/40 px-4 py-2 text-xs text-destructive">
					{message}
				</p>
			))}
			<Transcript
				inputs={props.inputs}
				items={snapshot.items}
				live={snapshot.activity.live}
				sessionId={props.sessionId}
				foldToolCalls={props.foldToolCalls}
				onOpenNode={props.onOpenNode}
			/>
			<SessionStandingBar activity={snapshot.activity} standing={snapshot.standing} />
		</>
	));
};
