import type { agentReading } from "@antumbra/domain-agents/rows/agent-reading.ts";
import { CommandAct } from "@antumbra/glass-components/act.tsx";
import { cn } from "@antumbra/glass-components/class-names.ts";
import { SUBJECT } from "@antumbra/glass-components/classes.ts";
import { Card } from "@antumbra/glass-components/ui/card.tsx";
import { AgentBerths } from "#agent-berths.tsx";
import { AgentSessions } from "#agent-sessions.tsx";
import { AgentVoyage, AgentWork } from "#agent-work.tsx";
import { Diagnostics } from "#diagnostics.tsx";
import type { SessionsApi } from "#glass.ts";
import { presenceWords } from "#presence.ts";

export const AgentCard = (props: {
	readonly api: SessionsApi;
	readonly agent: typeof agentReading.Row.Type;
	readonly sessionId?: string | undefined;
	readonly onSession: (id: string) => void;
	readonly onOpenTranscript?: ((id: string) => void) | undefined;
	readonly onPiece: (voyageId: string, pieceId: string) => void;
	readonly onVoyage: (id: string) => void;
}) => {
	const conversation = props.agent.currentSessionId;
	const showing = conversation !== null && conversation === props.sessionId;
	const open = conversation === null ? undefined : () => props.onSession(conversation);
	return (
		<Card className={cn("gap-0 p-0 transition-colors", showing ? "border-border-strong bg-accent" : "hover:border-border-strong")}>
			<div className="flex min-w-0 items-start gap-2 px-2.5 pt-2">
				<span className="min-w-0 flex-1">
					<AgentVoyage
						api={props.api}
						onPiece={props.onPiece}
						onVoyage={props.onVoyage}
						pieceIds={props.agent.pieceIds}
						voyageIds={props.agent.voyageIds}
					/>
				</span>
				{props.agent.canRetire ? <CommandAct command={props.api.agents.retire} input={{ id: props.agent.id }} label="Retire" /> : null}
			</div>
			<button
				aria-current={showing ? "true" : undefined}
				aria-label={`Open ${props.agent.role}`}
				className={cn(SUBJECT, "gap-0.5 px-2.5 py-1.5 disabled:pointer-events-none")}
				disabled={open === undefined}
				onClick={open}
				type="button"
			>
				<span className="flex w-full min-w-0 items-center gap-2">
					<span className="min-w-0 flex-1 truncate text-sm font-medium">{props.agent.role}</span>
					<span className="shrink-0 text-xs text-muted-foreground">
						{props.agent.presence === null ? props.agent.standing : presenceWords[props.agent.presence]}
					</span>
				</span>
				<AgentWork api={props.api} pieceIds={props.agent.pieceIds} />
			</button>
			<div className="flex min-w-0 flex-col gap-2 px-2.5 pb-2">
				<AgentSessions
					api={props.api}
					agent={props.agent}
					selected={props.sessionId}
					onSelect={props.onSession}
					onOpenTranscript={props.onOpenTranscript}
				/>
				<AgentBerths api={props.api} agentId={props.agent.id} />
				<Diagnostics api={props.api} agent={props.agent} />
			</div>
		</Card>
	);
};
