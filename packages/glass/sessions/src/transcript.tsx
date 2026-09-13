import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import type { TranscriptReading } from "@antumbra/domain-sessions/queries/transcript-rpc.ts";
import type { TranscriptItem } from "@antumbra/domain-sessions/rows/transcript.ts";
import { reading } from "@antumbra/glass-client/live.tsx";
import { Button } from "@antumbra/glass-components/shadcn/button.tsx";
import { ScrollArea } from "@antumbra/glass-components/shadcn/scroll-area.tsx";
import type { InputsClient } from "@antumbra/glass-inputs/client.ts";
import { useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";
import { useMemo } from "react";
import type { SessionsClient } from "#client.ts";
import type { SessionsApi } from "#glass.ts";
import { SessionHeader } from "#session-header.tsx";
import { foldRawRuns, foldToolRuns } from "#transcript/fold.ts";
import { TranscriptRow } from "#views/transcript-row.tsx";
import { useTail } from "#views/transcript-tail.ts";

const EMPTY = "What this session says and does appears here as it works.";

type Reading = typeof TranscriptReading.Type;

export const useTranscript = (sessions: SessionsClient, sessionId: string) => {
	const atom = useMemo(() => Atom.make(sessions["sessions.transcript"]({ id: SessionId.make(sessionId) })), [sessions, sessionId]);
	return useAtomValue(atom);
};

export const snapshotOf = <Failure,>(result: AsyncResult.AsyncResult<Reading, Failure>): Reading | undefined =>
	AsyncResult.isSuccess(result) ? result.value : undefined;

interface Shown {
	readonly inputs: InputsClient;
	readonly items: ReadonlyArray<TranscriptItem>;
	readonly live: boolean;
	readonly sessionId: string;
	readonly foldToolCalls: boolean;
	readonly onOpenNode?: ((id: string) => void) | undefined;
}

const Rows = (props: Shown) => {
	const items = foldRawRuns(props.foldToolCalls ? foldToolRuns(props.items) : props.items);
	if (items.length === 0) {
		return <p className="text-xs text-muted-foreground">{EMPTY}</p>;
	}
	return items.map((item, index) => (
		<TranscriptRow
			inputs={props.inputs}
			item={item}
			key={`${item.seq}-${index}`}
			live={props.live}
			onOpenNode={props.onOpenNode}
			sessionId={props.sessionId}
		/>
	));
};

export const Transcript = (props: Shown) => {
	const tail = useTail(props.items.length);
	return (
		<section className="relative flex min-h-0 min-w-0 flex-1 flex-col">
			<ScrollArea className="min-h-0 flex-1" ref={tail.root}>
				<div className="mx-auto flex max-w-[760px] min-w-0 flex-col gap-3 px-4 py-3">
					<Rows {...props} />
				</div>
			</ScrollArea>
			{tail.atTail ? null : (
				<Button className="absolute right-4 bottom-4" onClick={tail.toTail} size="sm" variant="outline">
					Jump to latest
				</Button>
			)}
		</section>
	);
};

export const TranscriptBody = (props: {
	readonly inputs: InputsClient;
	readonly snapshot: Reading;
	readonly sessionId: string;
	readonly foldToolCalls: boolean;
	readonly onOpenNode?: ((id: string) => void) | undefined;
}) => (
	<>
		{props.snapshot.unavailable.map((message) => (
			<p role="alert" key={message} className="border-b border-destructive/40 px-4 py-2 text-xs text-destructive">
				{message}
			</p>
		))}
		<Transcript
			foldToolCalls={props.foldToolCalls}
			inputs={props.inputs}
			items={props.snapshot.items}
			live={props.snapshot.activity.live}
			onOpenNode={props.onOpenNode}
			sessionId={props.sessionId}
		/>
	</>
);

export const TranscriptView = (props: {
	readonly api: SessionsApi;
	readonly sessions: SessionsClient;
	readonly inputs: InputsClient;
	readonly sessionId: string;
	readonly foldToolCalls: boolean;
}) => {
	const result = useTranscript(props.sessions, props.sessionId);
	return (
		<>
			<SessionHeader api={props.api} nodeId={props.sessionId} sessionId={props.sessionId} snapshot={snapshotOf(result)} />
			{reading(result, "Reading transcript…", (snapshot) => (
				<TranscriptBody foldToolCalls={props.foldToolCalls} inputs={props.inputs} sessionId={props.sessionId} snapshot={snapshot} />
			))}
		</>
	);
};
