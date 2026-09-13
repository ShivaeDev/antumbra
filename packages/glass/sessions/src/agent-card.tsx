import type { agentReading } from "@antumbra/domain-agents/rows/agent-reading.ts";
import { ActButton } from "@antumbra/glass-components/act-button.tsx";
import { StatusBadge } from "@antumbra/glass-components/compositions/status-badge.tsx";
import { Card, CardAction, CardContent, CardFooter, CardHeader } from "@antumbra/glass-components/shadcn/card.tsx";
import { AgentBerths } from "#agent-berths.tsx";
import { AgentSessions } from "#agent-sessions.tsx";
import { AgentVoyage, AgentWork } from "#agent-work.tsx";
import { Diagnostics } from "#diagnostics.tsx";
import type { SessionsApi } from "#glass.ts";
import { presenceWords } from "#presence.ts";

type Agent = typeof agentReading.Row.Type;

const STARTING = "Preparing to work";

const OPENS =
	"-mx-1 flex min-w-0 flex-col gap-1 rounded-md px-1 py-0.5 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-60";

const presenceWord = (agent: Agent): string => (agent.presence === null ? STARTING : presenceWords[agent.presence]);

export const AgentCard = (props: {
	readonly api: SessionsApi;
	readonly agent: Agent;
	readonly sessionId?: string | undefined;
	readonly onSession: (id: string) => void;
	readonly onOpenTranscript?: ((id: string) => void) | undefined;
	readonly onPiece: (voyageId: string, pieceId: string) => void;
	readonly onVoyage: (id: string) => void;
}) => {
	const conversation = props.agent.currentSessionId;
	const words = (conversation === null ? props.agent.standing : presenceWord(props.agent)).toLowerCase();
	const open = conversation === null ? undefined : () => props.onSession(conversation);
	const showing = conversation !== null && conversation === props.sessionId;
	return (
		<Card className="transition-colors hover:border-border-strong data-selected:bg-accent" data-selected={showing ? "" : undefined}>
			<CardHeader>
				<AgentVoyage
					api={props.api}
					onPiece={props.onPiece}
					onVoyage={props.onVoyage}
					pieceIds={props.agent.pieceIds}
					voyageIds={props.agent.voyageIds}
				/>
				<button
					aria-current={showing ? "true" : undefined}
					aria-label={open === undefined ? `${props.agent.role}, ${words}` : `Open ${props.agent.role}`}
					className={OPENS}
					disabled={open === undefined}
					onClick={open}
					type="button"
				>
					<span className="flex w-full min-w-0 items-center gap-2">
						<span className="min-w-0 truncate text-sm font-medium">{props.agent.role}</span>
						<StatusBadge state={words} />
					</span>
					<AgentWork api={props.api} pieceIds={props.agent.pieceIds} />
				</button>
				{props.agent.canRetire ? (
					<CardAction>
						<ActButton command={props.api.agents.retire} input={{ id: props.agent.id }} label="Retire" />
					</CardAction>
				) : null}
			</CardHeader>
			<CardContent className="flex min-w-0 flex-col gap-3 empty:hidden">
				<AgentSessions
					api={props.api}
					agent={props.agent}
					selected={props.sessionId}
					onSelect={props.onSession}
					onOpenTranscript={props.onOpenTranscript}
				/>
				<AgentBerths api={props.api} agentId={props.agent.id} />
			</CardContent>
			<CardFooter className="border-t">
				<Diagnostics api={props.api} agent={props.agent} />
			</CardFooter>
		</Card>
	);
};
