import { reading } from "@antumbra/glass-client/live.tsx";
import type { InputsClient } from "@antumbra/glass-inputs/client.ts";
import type { Drafts } from "@antumbra/glass-inputs/drafts.ts";
import { useState } from "react";
import type { SessionsClient } from "#client.ts";
import type { SessionsApi } from "#glass.ts";
import { SessionComposer } from "#session-composer.tsx";
import { SessionHeader } from "#session-header.tsx";
import { SessionTreePanel } from "#session-tree.tsx";
import { snapshotOf, TranscriptBody, useTranscript } from "#transcript.tsx";

export const PaneNote = ({ children }: { readonly children: string }) => <p className="px-4 py-3 text-xs text-muted-foreground">{children}</p>;

export const SessionPane = (props: {
	readonly api: SessionsApi;
	readonly sessions: SessionsClient;
	readonly inputs: InputsClient;
	readonly drafts: Drafts;
	readonly sessionId: string;
	readonly foldToolCalls: boolean;
	readonly onClose?: (() => void) | undefined;
	readonly onPopOut?: ((sessionId: string) => void) | undefined;
	readonly onError: (message: string) => void;
}) => {
	const [chosen, setChosen] = useState({ root: props.sessionId, reading: props.sessionId });
	const selected = chosen.root === props.sessionId ? chosen.reading : props.sessionId;
	const select = (id: string) => setChosen({ root: props.sessionId, reading: id });
	const result = useTranscript(props.sessions, selected);
	return (
		<section className="flex min-h-0 min-w-0 flex-1 flex-col">
			<SessionHeader
				api={props.api}
				nodeId={selected}
				onClose={props.onClose}
				onPopOut={props.onPopOut}
				sessionId={props.sessionId}
				snapshot={snapshotOf(result)}
			/>
			<SessionTreePanel api={props.api} sessionId={props.sessionId} selected={selected} onSelect={select} />
			{reading(result, "Reading transcript…", (snapshot) => (
				<TranscriptBody
					key={selected}
					foldToolCalls={props.foldToolCalls}
					inputs={props.inputs}
					onOpenNode={select}
					sessionId={selected}
					snapshot={snapshot}
				/>
			))}
			<SessionComposer api={props.api} inputs={props.inputs} drafts={props.drafts} sessionId={props.sessionId} onError={props.onError} />
		</section>
	);
};
