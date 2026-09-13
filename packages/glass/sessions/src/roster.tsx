import type { agentReading } from "@antumbra/domain-agents/rows/agent-reading.ts";
import { cn } from "@antumbra/glass-components/class-names.ts";
import { SectionHeading } from "@antumbra/glass-components/compositions/section-heading.tsx";
import type { ComponentProps } from "react";
import { AgentCard } from "#agent-card.tsx";

const GROUPS: ReadonlyArray<readonly [string, string]> = [
	["preparing", "Preparing"],
	["working", "Working"],
	["waiting", "Waiting"],
	["stranded", "Stranded"],
	["idle", "Idle"],
	["asleep", "Asleep"],
	["retired", "Retired"],
	["smoothing", "Smoothing"],
];

const groupOf = (agent: typeof agentReading.Row.Type): string => (agent.role === "smoother" ? "smoothing" : agent.state);

const rank = (group: string): number => GROUPS.findIndex(([key]) => key === group);

const titleOf = (group: string): string => GROUPS.find(([key]) => key === group)?.[1] ?? group;

export const Roster = (props: Omit<ComponentProps<typeof AgentCard>, "agent"> & { readonly agents: readonly (typeof agentReading.Row.Type)[] }) => {
	const groups = Map.groupBy(props.agents, groupOf);
	return [...groups]
		.toSorted(([left], [right]) => rank(left) - rank(right))
		.map(([group, agents]) => (
			<SectionHeading count={agents.length} key={group} title={titleOf(group)}>
				<div className={cn("grid min-w-0 gap-3", props.sessionId === undefined ? "grid-cols-[repeat(auto-fill,minmax(300px,1fr))]" : "grid-cols-1")}>
					{agents.map((agent) => (
						<AgentCard {...props} key={agent.id} agent={agent} />
					))}
				</div>
			</SectionHeading>
		));
};
