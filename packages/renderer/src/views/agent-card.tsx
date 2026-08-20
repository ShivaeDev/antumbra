import type { AgentSummary } from "@antumbra/contract";
import { retireAgent } from "#adapters/trpc.ts";
import { Button } from "#components/ui/button.tsx";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
} from "#components/ui/card.tsx";
import { AgentBerths } from "#views/agent-berths.tsx";
import { AgentSessions } from "#views/agent-sessions.tsx";
import { DiagnosticsDisclosure } from "#views/diagnostics-disclosure.tsx";

export const AgentCard = ({
	agent,
	onError,
	onSelect,
	selected,
}: {
	readonly agent: AgentSummary;
	readonly onError: (message: string) => void;
	readonly onSelect: (sessionId: string) => void;
	readonly selected: string | undefined;
}) => (
	<Card>
		<CardHeader>
			{/* why: an agent's role is the name the admiral gave it and the one
			thing on this card that must never be guessed at, so it wraps to as
			many lines as it needs instead of ending in an ellipsis. */}
			<div className="min-w-0 text-sm font-medium wrap-anywhere">
				{agent.role}
			</div>
			<CardDescription className="line-clamp-2 wrap-anywhere">
				{agent.charter}
			</CardDescription>
			{agent.status === "alive" ? (
				<CardAction>
					<Button
						onClick={() => retireAgent(agent.id, onError)}
						size="sm"
						variant="destructive"
					>
						Retire
					</Button>
				</CardAction>
			) : null}
		</CardHeader>
		<CardContent className="flex flex-col gap-1.5">
			<AgentSessions
				onError={onError}
				onSelect={onSelect}
				selected={selected}
				sessions={agent.sessions}
			/>
			<AgentBerths berths={agent.berths} />
		</CardContent>
		<DiagnosticsDisclosure agent={agent} />
	</Card>
);
