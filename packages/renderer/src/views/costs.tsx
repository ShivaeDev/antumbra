import type { UsageTotal } from "@antumbra/contract";
import { watchCosts } from "#adapters/trpc-costs.ts";
import { costPhrase, costReported, costTitle } from "#costs/format.ts";
import { modelRows, voyageRows } from "#costs/rows.ts";
import { useFeed } from "#hooks/feed.ts";
import { CostsCharts } from "#views/costs-charts.tsx";
import { SpendTable } from "#views/costs-table.tsx";

const EXPLAINER =
	"Tokens and cost across the fleet, as the backends report them. Every backend counts tokens, but only some price them: a cost marked ≥ is a floor, and a total with no priced turns is shown as not reported.";

const Headline = ({ total }: { readonly total: UsageTotal }) =>
	total.turns === 0 ? null : (
		<span className="text-2xs text-muted-foreground tabular-nums" title={costTitle(total)}>
			{costReported(total) ? `${costPhrase(total)} all time` : costPhrase(total)}
		</span>
	);

const Header = ({ total }: { readonly total: UsageTotal }) => (
	<header className="flex shrink-0 flex-col gap-1 border-border border-b px-4 py-3">
		<div className="flex items-baseline gap-2">
			<h2 className="text-base">The costs</h2>
			<Headline total={total} />
		</div>
		<p className="text-2xs text-muted-foreground">{EXPLAINER}</p>
	</header>
);

export const CostsPanel = () => {
	const { error: feedError, value: costs } = useFeed("costs", watchCosts);

	if (costs === undefined) {
		return (
			<section aria-live="polite" className="m-auto text-xs text-muted-foreground">
				{feedError === undefined ? "taking a sight…" : `feed lost: ${feedError}`}
			</section>
		);
	}
	return (
		<section className="flex min-h-0 min-w-0 flex-1 flex-col bg-background font-sans text-foreground">
			<Header total={costs.total} />
			{feedError === undefined ? null : (
				<p className="border-destructive/30 border-b bg-destructive/10 px-4 py-1.5 text-xs text-destructive" role="alert">
					feed lost: {feedError}
				</p>
			)}
			{costs.total.turns === 0 ? (
				<p className="m-auto max-w-sm px-6 text-center text-xs text-muted-foreground">Tokens and cost appear here once an agent takes a turn</p>
			) : (
				<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-4">
					<CostsCharts days={costs.days} />
					<SpendTable heading="By voyage" lead="Voyage" rows={voyageRows(costs)} span="all time" />
					<SpendTable heading="By model" lead="Model" rows={modelRows(costs)} span="all time" />
				</div>
			)}
		</section>
	);
};
