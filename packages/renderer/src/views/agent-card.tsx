import type { AgentSummary } from "@antumbra/contract";
import { retireAgent } from "#adapters/trpc.ts";
import { Button } from "#components/ui/button.tsx";
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
} from "#components/ui/card.tsx";
import type { Navigate } from "#console/navigation.ts";
import { cn } from "#lib/utils.ts";
import { AgentBerths } from "#views/agent-berths.tsx";
import { AgentSessions } from "#views/agent-sessions.tsx";
import { AgentWorkLines } from "#views/agent-work.tsx";
import { DiagnosticsDisclosure } from "#views/diagnostics-disclosure.tsx";

// why: the charter is what the agent was told, not what it is doing, so it
// waits one click away the way the diagnostics do rather than taking the two
// lines the work now leads with.
const CharterDisclosure = ({ charter }: { readonly charter: string }) => (
	<details className="min-w-0 border-t border-border pt-1.5">
		<summary className="cursor-pointer text-2xs text-muted-foreground hover:text-foreground">
			charter
		</summary>
		<p className="min-w-0 pt-1.5 text-2xs text-muted-foreground wrap-anywhere">
			{charter}
		</p>
	</details>
);

// why: a card leads with what the agent is doing — the piece and the voyage it
// is for, or the voyage it commands — and its role follows as the name the
// admiral gave it. An agent with no work is known by that name alone, so the
// name leads in its place rather than leaving the card headless.
export const AgentCard = ({
	agent,
	onError,
	onNavigate,
	onSelect,
	selected,
}: {
	readonly agent: AgentSummary;
	readonly onError: (message: string) => void;
	readonly onNavigate: Navigate;
	readonly onSelect: (sessionId: string) => void;
	readonly selected: string | undefined;
}) => (
	<Card>
		<CardHeader>
			<AgentWorkLines onNavigate={onNavigate} work={agent.work} />
			{/* why: the role is the one thing on this card that must never be
			guessed at, so it wraps to as many lines as it needs instead of ending
			in an ellipsis. */}
			<div
				className={cn(
					"min-w-0 wrap-anywhere",
					agent.work.length === 0
						? "text-sm font-medium"
						: "text-2xs text-muted-foreground",
				)}
			>
				{agent.role}
			</div>
			{agent.canRetire ? (
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
		<CharterDisclosure charter={agent.charter} />
		<DiagnosticsDisclosure agent={agent} />
	</Card>
);
