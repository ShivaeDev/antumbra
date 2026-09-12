import type { agentReading } from "@antumbra/domain-agents/rows/agent-reading.ts";
import { CommandAct } from "@antumbra/glass-components/act.tsx";
import { Card, CardContent, CardHeader } from "@antumbra/glass-components/ui/card.tsx";
import { AgentBerths } from "#agent-berths.tsx";
import { AgentSessions } from "#agent-sessions.tsx";
import { AgentWork } from "#agent-work.tsx";
import type { SessionsApi } from "#glass.ts";

export const AgentCard = (props: {
	readonly api: SessionsApi;
	readonly agent: typeof agentReading.Row.Type;
	readonly sessionId?: string | undefined;
	readonly onSession: (id: string) => void;
	readonly onOpenTranscript?: ((id: string) => void) | undefined;
	readonly onPiece: (voyageId: string, pieceId: string) => void;
	readonly onVoyage: (id: string) => void;
}) => (
	<Card>
		<CardHeader>
			<AgentWork
				api={props.api}
				pieceIds={props.agent.pieceIds}
				voyageIds={props.agent.voyageIds}
				onPiece={props.onPiece}
				onVoyage={props.onVoyage}
			/>
			<div className="flex items-center gap-2">
				<span className="min-w-0 flex-1 text-sm font-medium">{props.agent.role}</span>
				<span className="text-xs text-muted-foreground">{props.agent.standing}</span>
				{props.agent.canRetire ? <CommandAct command={props.api.agents.retire} input={{ id: props.agent.id }} label="Retire" /> : null}
			</div>
		</CardHeader>
		<CardContent className="flex flex-col gap-2">
			<AgentSessions
				api={props.api}
				agent={props.agent}
				selected={props.sessionId}
				onSelect={props.onSession}
				onOpenTranscript={props.onOpenTranscript}
			/>
			<AgentBerths api={props.api} agentId={props.agent.id} />
			<details className="border-t border-border pt-1.5">
				<summary className="cursor-pointer text-xs text-muted-foreground">charter</summary>
				<p className="pt-1.5 text-xs wrap-anywhere">{props.agent.charter}</p>
			</details>
		</CardContent>
	</Card>
);
