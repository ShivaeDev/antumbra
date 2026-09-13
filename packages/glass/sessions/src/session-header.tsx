import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import type { TranscriptReading } from "@antumbra/domain-sessions/queries/transcript-rpc.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { StatusBadge } from "@antumbra/glass-components/compositions/status-badge.tsx";
import { Button } from "@antumbra/glass-components/shadcn/button.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@antumbra/glass-components/shadcn/tooltip.tsx";
import { SquareArrowOutUpRightIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { SessionsApi } from "#glass.ts";
import { SessionActs } from "#session-acts.tsx";
import { SessionCosts } from "#views/session-costs.tsx";

type Reading = typeof TranscriptReading.Type;

const IconAct = (props: { readonly children: ReactNode; readonly onAct: () => void; readonly words: string }) => (
	<Tooltip>
		<TooltipTrigger asChild>
			<Button aria-label={props.words} onClick={props.onAct} size="icon-sm" variant="ghost">
				{props.children}
			</Button>
		</TooltipTrigger>
		<TooltipContent>{props.words}</TooltipContent>
	</Tooltip>
);

const NodeName = (props: { readonly api: SessionsApi; readonly nodeId: string }) => (
	<Live query={props.api.sessions.reading} input={{ id: SessionId.make(props.nodeId) }}>
		{(node) => <span className="min-w-0 truncate text-xs text-muted-foreground">{node?.label ?? node?.kind}</span>}
	</Live>
);

export const SessionHeader = (props: {
	readonly api: SessionsApi;
	readonly sessionId: string;
	readonly nodeId: string;
	readonly snapshot: Reading | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly onPopOut?: ((sessionId: string) => void) | undefined;
}) => {
	const standing = props.snapshot?.standing;
	const tool = props.snapshot?.activity.words;
	return (
		<header className="flex h-12 min-w-0 shrink-0 items-center gap-2 border-b border-border px-4">
			<Live query={props.api.agents.bySession} input={{ sessionId: SessionId.make(props.sessionId) }}>
				{(agent) => (
					<>
						{agent === null ? null : <span className="min-w-0 truncate text-sm font-medium">{agent.role}</span>}
						{props.nodeId === props.sessionId ? null : <NodeName api={props.api} nodeId={props.nodeId} />}
						<span className="shrink-0 font-mono text-xs text-muted-foreground">{props.nodeId}</span>
						{agent === null ? null : <StatusBadge state={agent.standing} />}
						<span className="min-w-0 flex-1" />
						{tool === undefined ? null : <span className="shrink-0 truncate text-xs text-muted-foreground">{tool}</span>}
						{standing === undefined ? null : <SessionCosts standing={standing} />}
						{agent === null ? null : (
							<SessionActs api={props.api} canInterrupt={agent.canInterrupt} canSleep={agent.canSleep} sessionId={props.sessionId} />
						)}
					</>
				)}
			</Live>
			{props.onPopOut === undefined ? null : (
				<IconAct onAct={() => props.onPopOut?.(props.nodeId)} words="Open in a tab">
					<SquareArrowOutUpRightIcon />
				</IconAct>
			)}
			{props.onClose === undefined ? null : (
				<IconAct onAct={props.onClose} words="Close">
					<XIcon />
				</IconAct>
			)}
		</header>
	);
};
