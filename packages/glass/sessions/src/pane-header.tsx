import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
import { SquareArrowOutUpRightIcon, XIcon } from "lucide-react";
import type { SessionsApi } from "#glass.ts";

export const PaneHeader = (props: {
	readonly api: SessionsApi;
	readonly sessionId: string;
	readonly reading: string;
	readonly onClose?: (() => void) | undefined;
	readonly onPopOut?: ((sessionId: string) => void) | undefined;
}) => (
	<header className="flex min-w-0 items-center gap-2 border-b border-border px-4 py-2">
		<Live query={props.api.agents.bySession} input={{ sessionId: SessionId.make(props.sessionId) }}>
			{(agent) => <span className="min-w-0 truncate text-xs font-medium">{agent?.role ?? "Agent activity"}</span>}
		</Live>
		{props.reading === props.sessionId ? null : (
			<Live query={props.api.sessions.reading} input={{ id: SessionId.make(props.reading) }}>
				{(node) => <span className="min-w-0 truncate text-xs text-muted-foreground">{node?.label ?? node?.kind}</span>}
			</Live>
		)}
		<span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{props.reading}</span>
		{props.onPopOut === undefined ? null : (
			<Button aria-label="Open in a window" onClick={() => props.onPopOut?.(props.reading)} size="icon" variant="ghost">
				<SquareArrowOutUpRightIcon />
			</Button>
		)}
		{props.onClose === undefined ? null : (
			<Button aria-label="Close transcript" onClick={props.onClose} size="icon" variant="ghost">
				<XIcon />
			</Button>
		)}
	</header>
);
