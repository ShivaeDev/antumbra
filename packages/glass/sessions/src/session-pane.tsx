import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
import type { InputsClient } from "@antumbra/glass-inputs/client.ts";
import type { Drafts } from "@antumbra/glass-inputs/drafts.ts";
import { XIcon } from "lucide-react";
import { useState } from "react";
import type { SessionsClient } from "#client.ts";
import type { SessionsApi } from "#glass.ts";
import { SessionComposer } from "#session-composer.tsx";
import { SessionTreePanel } from "#session-tree.tsx";
import { TranscriptView } from "#transcript.tsx";

export const PaneNote = ({ children }: { readonly children: string }) => <p className="px-4 py-3 text-xs text-muted-foreground">{children}</p>;

export const SessionPane = (props: {
	readonly api: SessionsApi;
	readonly sessions: SessionsClient;
	readonly inputs: InputsClient;
	readonly drafts: Drafts;
	readonly sessionId: string;
	readonly foldToolCalls: boolean;
	readonly onClose?: (() => void) | undefined;
	readonly onError: (message: string) => void;
}) => {
	const [chosen, setChosen] = useState({ root: props.sessionId, reading: props.sessionId });
	const selected = chosen.root === props.sessionId ? chosen.reading : props.sessionId;
	const select = (id: string) => setChosen({ root: props.sessionId, reading: id });
	return (
		<section className="flex min-h-0 min-w-0 flex-1 flex-col">
			<header className="flex min-w-0 items-center gap-2 border-b border-border px-4 py-2">
				<Live query={props.api.agents.bySession} input={{ sessionId: SessionId.make(props.sessionId) }}>
					{(agent) => <span className="min-w-0 truncate text-xs font-medium">{agent?.role ?? "Agent activity"}</span>}
				</Live>
				{selected === props.sessionId ? null : (
					<Live query={props.api.sessions.reading} input={{ id: SessionId.make(selected) }}>
						{(node) => <span className="min-w-0 truncate text-xs text-muted-foreground">{node?.label ?? node?.kind}</span>}
					</Live>
				)}
				<span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{selected}</span>
				{props.onClose === undefined ? null : (
					<Button aria-label="Close transcript" onClick={props.onClose} size="icon" variant="ghost">
						<XIcon />
					</Button>
				)}
			</header>
			<SessionTreePanel api={props.api} sessionId={props.sessionId} selected={selected} onSelect={select} />
			<TranscriptView
				key={selected}
				api={props.api}
				sessions={props.sessions}
				inputs={props.inputs}
				sessionId={selected}
				foldToolCalls={props.foldToolCalls}
				onOpenNode={select}
			/>
			<SessionComposer api={props.api} inputs={props.inputs} drafts={props.drafts} sessionId={props.sessionId} onError={props.onError} />
		</section>
	);
};
