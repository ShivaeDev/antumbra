import type { agentReading } from "@antumbra/domain-agents/rows/agent-reading.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { cn } from "@antumbra/glass-components/class-names.ts";
import { SUBJECT } from "@antumbra/glass-components/classes.ts";
import { Section, SectionHeading } from "@antumbra/glass-components/section.tsx";
import { Badge } from "@antumbra/glass-components/ui/badge.tsx";
import type { VoyagesDisplayApi } from "#display.ts";

type Agent = typeof agentReading.Row.Type;

export const Crew = (props: {
	readonly api: VoyagesDisplayApi;
	readonly voyageId: string;
	readonly agentId?: string | undefined;
	readonly onAgent: (agentId: string) => void;
}) => (
	<Live input={{ voyageId: VoyageId.make(props.voyageId) }} query={props.api.agents.byVoyage}>
		{(agents) => (
			<Section>
				<SectionHeading count={agents.length} title="Crew" />
				{agents.length === 0 ? <p className="text-2xs text-muted-foreground">Nobody hailed yet — launching a piece brings its hand aboard</p> : null}
				<ul className="flex min-w-0 flex-col gap-1">
					{agents.map((agent) => (
						<CrewMember agent={agent} key={agent.id} onAgent={props.onAgent} showing={props.agentId === agent.id} />
					))}
				</ul>
			</Section>
		)}
	</Live>
);

const CrewMember = (props: { readonly agent: Agent; readonly showing: boolean; readonly onAgent: (agentId: string) => void }) => (
	<li className="min-w-0">
		<button
			aria-current={props.showing ? "true" : undefined}
			aria-label={`Open ${props.agent.role} ${props.agent.id}`}
			className={cn(SUBJECT, "w-full flex-row items-center gap-2 px-1.5 py-1 text-xs", props.showing && "bg-accent")}
			onClick={() => props.onAgent(props.agent.id)}
			type="button"
		>
			<span className="min-w-0 truncate font-medium">{props.agent.role}</span>
			<span className="font-mono text-2xs text-muted-foreground">{props.agent.id}</span>
			<Badge className="ml-auto" variant="outline">
				{props.agent.status}
			</Badge>
		</button>
	</li>
);
