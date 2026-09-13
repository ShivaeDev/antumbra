import type { agentReading } from "@antumbra/domain-agents/rows/agent-reading.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { cn } from "@antumbra/glass-components/class-names.ts";
import { SectionHeading } from "@antumbra/glass-components/compositions/section-heading.tsx";
import { StatusBadge } from "@antumbra/glass-components/compositions/status-badge.tsx";
import type { VoyagesDisplayApi } from "#display.ts";

type Agent = typeof agentReading.Row.Type;

const NOBODY = "Nobody is aboard yet; launching a piece brings its hand aboard.";

export const Crew = (props: {
	readonly api: VoyagesDisplayApi;
	readonly voyageId: string;
	readonly agentId?: string | undefined;
	readonly onAgent: (agentId: string) => void;
}) => (
	<Live input={{ voyageId: VoyageId.make(props.voyageId) }} query={props.api.agents.byVoyage}>
		{(agents) => (
			<SectionHeading count={agents.length} title="Crew">
				{agents.length === 0 ? <p className="text-xs text-muted-foreground">{NOBODY}</p> : null}
				<ul className="flex min-w-0 flex-col">
					{agents.map((agent) => (
						<CrewMember agent={agent} key={agent.id} onAgent={props.onAgent} showing={props.agentId === agent.id} />
					))}
				</ul>
			</SectionHeading>
		)}
	</Live>
);

const CrewMember = (props: { readonly agent: Agent; readonly showing: boolean; readonly onAgent: (agentId: string) => void }) => (
	<li className="min-w-0">
		<button
			aria-current={props.showing ? "true" : undefined}
			aria-label={`Open ${props.agent.role} ${props.agent.id}`}
			className={cn(
				"flex h-8 w-full min-w-0 items-center gap-2 rounded-md px-2 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60",
				props.showing && "bg-accent",
			)}
			onClick={() => props.onAgent(props.agent.id)}
			type="button"
		>
			<span className="min-w-0 truncate font-medium">{props.agent.role}</span>
			<span className="font-mono text-xs text-muted-foreground">{props.agent.id}</span>
			<span className="ml-auto shrink-0">
				<StatusBadge state={props.agent.standing} />
			</span>
		</button>
	</li>
);
