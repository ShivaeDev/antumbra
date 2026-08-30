import type { AgentSummary } from "@antumbra/contract";
import { retireAgent } from "#adapters/trpc.ts";
import { Button } from "#components/ui/button.tsx";
import { Card, CardAction, CardContent, CardHeader } from "#components/ui/card.tsx";
import { cn } from "#lib/utils.ts";
import { AgentBerths } from "#views/agent-berths.tsx";
import { AgentSessions } from "#views/agent-sessions.tsx";
import { AgentWorkLines } from "#views/agent-work.tsx";
import { DiagnosticsDisclosure } from "#views/diagnostics-disclosure.tsx";

const CharterDisclosure = ({ charter }: { readonly charter: string }) => (
	<details className="min-w-0 border-t border-border pt-1.5">
		<summary className="cursor-pointer text-2xs text-muted-foreground hover:text-foreground">charter</summary>
		<p className="min-w-0 pt-1.5 text-2xs text-muted-foreground wrap-anywhere">{charter}</p>
	</details>
);

export const AgentCard = ({
	agent,
	onError,
	onPiece,
	onSelect,
	onVoyage,
	selected,
}: {
	readonly agent: AgentSummary;
	readonly onError: (message: string) => void;
	readonly onPiece: (voyageId: string, pieceId: string) => void;
	readonly onSelect: (sessionId: string) => void;
	readonly onVoyage: (voyageId: string) => void;
	readonly selected: string | undefined;
}) => (
	<Card>
		<CardHeader>
			<AgentWorkLines onPiece={onPiece} onVoyage={onVoyage} work={agent.work} />
			<div className={cn("min-w-0 wrap-anywhere", agent.work.length === 0 ? "text-sm font-medium" : "text-2xs text-muted-foreground")}>
				{agent.role}
			</div>
			{agent.canRetire ? (
				<CardAction>
					<Button onClick={() => retireAgent(agent.id, onError)} size="sm" variant="destructive">
						Retire
					</Button>
				</CardAction>
			) : null}
		</CardHeader>
		<CardContent className="flex flex-col gap-1.5">
			<AgentSessions onError={onError} onSelect={onSelect} selected={selected} sessions={agent.sessions} />
			<AgentBerths berths={agent.berths} />
		</CardContent>
		<CharterDisclosure charter={agent.charter} />
		<DiagnosticsDisclosure agent={agent} />
	</Card>
);
