import type { agentReading } from "@antumbra/domain-agents/rows/agent-reading.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { cn } from "@antumbra/glass-components/class-names.ts";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
import { SquareArrowOutUpRightIcon } from "lucide-react";
import type { SessionsApi } from "#glass.ts";
import { SessionActs } from "#session-acts.tsx";

export const AgentSessions = (props: {
	readonly api: SessionsApi;
	readonly agent: typeof agentReading.Row.Type;
	readonly selected: string | undefined;
	readonly onSelect: (id: string) => void;
	readonly onOpenTranscript?: ((id: string) => void) | undefined;
}) => (
	<Live query={props.api.sessions.forAgent} input={{ agentId: props.agent.id }}>
		{(sessions) =>
			sessions
				.filter((session) => session.parentSessionId === null)
				.map((session) => (
					<div key={session.id} className="flex items-center gap-2">
						<button
							type="button"
							aria-current={props.selected === session.id ? "true" : undefined}
							className={cn("min-w-0 flex-1 rounded-md px-2 py-1 text-left text-xs hover:bg-accent", props.selected === session.id && "bg-secondary")}
							onClick={() => props.onSelect(session.id)}
						>
							Read activity · {session.backend} · {session.id.slice(0, 8)}
						</button>
						{props.onOpenTranscript === undefined ? null : (
							<Button aria-label="Open in a window" onClick={() => props.onOpenTranscript?.(session.id)} size="icon" variant="ghost">
								<SquareArrowOutUpRightIcon />
							</Button>
						)}
						{session.id === props.agent.currentSessionId ? (
							<SessionActs api={props.api} sessionId={session.id} canInterrupt={props.agent.canInterrupt} canSleep={props.agent.canSleep} />
						) : null}
					</div>
				))
		}
	</Live>
);
