import type { agentReading } from "@antumbra/domain-agents/rows/agent-reading.ts";
import type { session } from "@antumbra/domain-sessions/rows/session.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { cn } from "@antumbra/glass-components/class-names.ts";
import { Button } from "@antumbra/glass-components/shadcn/button.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@antumbra/glass-components/shadcn/tooltip.tsx";
import { SquareArrowOutUpRightIcon } from "lucide-react";
import type { SessionsApi } from "#glass.ts";
import { SessionActs } from "#session-acts.tsx";

interface Props {
	readonly api: SessionsApi;
	readonly agent: typeof agentReading.Row.Type;
	readonly selected: string | undefined;
	readonly onSelect: (id: string) => void;
	readonly onOpenTranscript?: ((id: string) => void) | undefined;
}

const OpenInATab = ({ onOpen }: { readonly onOpen: () => void }) => (
	<Tooltip>
		<TooltipTrigger asChild>
			<Button aria-label="Open in a tab" onClick={onOpen} size="icon-sm" variant="ghost">
				<SquareArrowOutUpRightIcon />
			</Button>
		</TooltipTrigger>
		<TooltipContent>Open in a tab</TooltipContent>
	</Tooltip>
);

const SessionRow = (props: Props & { readonly session: typeof session.Row.Type }) => (
	<div className="flex min-w-0 items-center gap-2">
		<button
			aria-current={props.selected === props.session.id ? "true" : undefined}
			className={cn(
				"flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60",
				props.selected === props.session.id && "bg-accent",
			)}
			onClick={() => props.onSelect(props.session.id)}
			type="button"
		>
			<span className="text-sm">{props.session.backend}</span>
			<span className="text-xs text-muted-foreground">·</span>
			<span className="min-w-0 font-mono text-xs text-muted-foreground">{props.session.id}</span>
		</button>
		{props.onOpenTranscript === undefined ? null : <OpenInATab onOpen={() => props.onOpenTranscript?.(props.session.id)} />}
		{props.session.id === props.agent.currentSessionId ? (
			<SessionActs api={props.api} sessionId={props.session.id} canInterrupt={props.agent.canInterrupt} canSleep={props.agent.canSleep} />
		) : null}
	</div>
);

export const AgentSessions = (props: Props) => (
	<Live query={props.api.sessions.forAgent} input={{ agentId: props.agent.id }}>
		{(sessions) =>
			sessions.filter((session) => session.parentSessionId === null).map((session) => <SessionRow {...props} key={session.id} session={session} />)
		}
	</Live>
);
