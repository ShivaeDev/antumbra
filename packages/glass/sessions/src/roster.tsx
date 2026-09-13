import type { agentReading } from "@antumbra/domain-agents/rows/agent-reading.ts";
import { cn } from "@antumbra/glass-components/class-names.ts";
import { SectionHeading } from "@antumbra/glass-components/compositions/section-heading.tsx";
import type { ComponentProps } from "react";
import { AgentCard } from "#agent-card.tsx";

const order = ["Working", "Stranded", "Preparing to work", "Idle", "Asleep", "No open conversation", "Dormant", "Retired", "Smoothing"];

const groupOf = (agent: typeof agentReading.Row.Type): string => (agent.role === "smoother" ? "Smoothing" : agent.standing);

export const Roster = (props: Omit<ComponentProps<typeof AgentCard>, "agent"> & { readonly agents: readonly (typeof agentReading.Row.Type)[] }) => {
	const groups = Map.groupBy(props.agents, groupOf);
	return [...groups]
		.toSorted(([left], [right]) => order.indexOf(left) - order.indexOf(right))
		.map(([standing, agents]) => (
			<SectionHeading count={agents.length} key={standing} title={standing === "Idle" ? "Listening" : standing}>
				<div className={cn("grid min-w-0 gap-3", props.sessionId === undefined ? "grid-cols-[repeat(auto-fill,minmax(300px,1fr))]" : "grid-cols-1")}>
					{agents.map((agent) => (
						<AgentCard {...props} key={agent.id} agent={agent} />
					))}
				</div>
			</SectionHeading>
		));
};
