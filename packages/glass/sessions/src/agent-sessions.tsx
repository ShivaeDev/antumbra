import type { agentReading } from "@antumbra/domain-agents/rows/agent-reading.ts";
import type { session } from "@antumbra/domain-sessions/rows/session.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { cn } from "@antumbra/glass-components/class-names.ts";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
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

const SessionRow = (props: Props & { readonly session: typeof session.Row.Type }) => (
	<div className="flex items-center gap-2">
		<button
			type="button"
			aria-current={props.selected === props.session.id ? "true" : undefined}
			className={cn("min-w-0 flex-1 rounded-md px-2 py-1 text-left text-xs hover:bg-accent", props.selected === props.session.id && "bg-secondary")}
			onClick={() => props.onSelect(props.session.id)}
		>
			Read activity · {props.session.backend} · {props.session.id.slice(0, 8)}
		</button>
		{props.onOpenTranscript === undefined ? null : (
			<Button aria-label="Open in a window" onClick={() => props.onOpenTranscript?.(props.session.id)} size="icon" variant="ghost">
				<SquareArrowOutUpRightIcon />
			</Button>
		)}
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
