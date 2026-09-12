import type { agentReading } from "@antumbra/domain-agents/rows/agent-reading.ts";
import { Separator } from "@antumbra/glass-components/ui/separator.tsx";
import type { ComponentProps } from "react";
import { AgentCard } from "#agent-card.tsx";

const order = ["Working", "Stranded", "Preparing to work", "Idle", "Asleep", "No open conversation", "Dormant", "Retired"];

export const Roster = (props: Omit<ComponentProps<typeof AgentCard>, "agent"> & { readonly agents: readonly (typeof agentReading.Row.Type)[] }) => {
	const groups = Map.groupBy(props.agents, (agent) => agent.standing);
	return [...groups]
		.toSorted(([left], [right]) => order.indexOf(left) - order.indexOf(right))
		.map(([standing, agents]) => (
			<section key={standing} className="flex min-w-0 flex-col gap-2">
				<header className="flex items-center gap-2">
					<h3 className="text-xs font-medium text-muted-foreground">{standing}</h3>
					<span className="text-xs text-muted-foreground">{agents.length}</span>
					<Separator className="min-w-0 flex-1" />
				</header>
				<div className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(19rem,1fr))] gap-2">
					{agents.map((agent) => (
						<AgentCard {...props} key={agent.id} agent={agent} />
					))}
				</div>
			</section>
		));
};
