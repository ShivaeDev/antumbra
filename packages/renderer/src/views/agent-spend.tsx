import { watchCosts } from "#adapters/trpc-costs.ts";
import { useFeed } from "#hooks/feed.ts";
import { SpendInline } from "#views/spend-inline.tsx";

export const AgentSpend = ({ agentId }: { readonly agentId: string }) => {
	const { value: costs } = useFeed("costs", watchCosts);
	const spend = costs?.agents.find((candidate) => candidate.agentId === agentId);

	if (costs === undefined) {
		return null;
	}
	return (
		<span className="ml-3 flex shrink-0 items-center gap-1 whitespace-nowrap">
			<span>agent</span>
			{spend === undefined ? <span>no turns yet</span> : <SpendInline total={spend.total} />}
		</span>
	);
};
