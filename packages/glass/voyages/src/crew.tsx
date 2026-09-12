import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { Section, SectionHeading } from "@antumbra/glass-components/section.tsx";
import { Badge } from "@antumbra/glass-components/ui/badge.tsx";
import type { VoyagesDisplayApi } from "#display.ts";

export const Crew = (props: { readonly api: VoyagesDisplayApi; readonly voyageId: string }) => (
	<Live input={{ voyageId: VoyageId.make(props.voyageId) }} query={props.api.agents.byVoyage}>
		{(agents) => (
			<Section>
				<SectionHeading count={agents.length} title="Crew" />
				{agents.length === 0 ? <p className="text-2xs text-muted-foreground">Nobody hailed yet — launching a piece brings its hand aboard</p> : null}
				<ul className="flex min-w-0 flex-col gap-1">
					{agents.map((agent) => (
						<CrewMember agent={agent} key={agent.id} />
					))}
				</ul>
			</Section>
		)}
	</Live>
);

const CrewMember = ({ agent }: { readonly agent: typeof import("@antumbra/domain-agents/rows/agent-reading.ts").agentReading.Row.Type }) => (
	<li className="flex min-w-0 items-center gap-2 text-xs" key={agent.id}>
		<span className="min-w-0 truncate font-medium">{agent.role}</span>
		<span className="font-mono text-2xs text-muted-foreground">{agent.id.slice(0, 8)}</span>
		<Badge className="ml-auto" variant="outline">
			{agent.status}
		</Badge>
	</li>
);
