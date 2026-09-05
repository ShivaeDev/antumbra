import { watchCosts } from "#adapters/trpc-costs.ts";
import { useFeed } from "#hooks/feed.ts";
import { SpendInline } from "#views/spend-inline.tsx";

export const VoyageSpend = ({ voyageId }: { readonly voyageId: string }) => {
	const { value: costs } = useFeed("costs", watchCosts);
	const total = costs?.voyages.find((spent) => spent.voyageId === voyageId)?.total;

	if (total === undefined || total.turns === 0) {
		return null;
	}
	return (
		<span className="ml-auto flex shrink-0 items-center gap-1 whitespace-nowrap text-2xs text-muted-foreground tabular-nums">
			<SpendInline total={total} />
		</span>
	);
};
