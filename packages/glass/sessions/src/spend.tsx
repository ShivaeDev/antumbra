import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import type { SessionsApi } from "#glass.ts";
import { SpendInline } from "#views/spend-inline.tsx";

export const AgentSpend = ({ api, agentId }: { readonly api: SessionsApi; readonly agentId: string }) => (
	<Live query={api.costs.forAgent} input={{ agentId }} waiting="Reading agent spend…">
		{(total) => (
			<span className="ml-3 flex shrink-0 items-center gap-1 whitespace-nowrap">
				<span>agent</span>
				{total.turns === 0 ? <span>no turns yet</span> : <SpendInline total={total} />}
			</span>
		)}
	</Live>
);

export const VoyageSpend = ({ api, voyageId }: { readonly api: SessionsApi; readonly voyageId: string }) => (
	<Live query={api.costs.forVoyage} input={{ voyageId: VoyageId.make(voyageId) }} waiting="Reading voyage spend…">
		{(total) =>
			total.turns === 0 ? null : (
				<span className="ml-auto flex shrink-0 items-center gap-1 whitespace-nowrap text-2xs text-muted-foreground tabular-nums">
					<SpendInline total={total} />
				</span>
			)
		}
	</Live>
);
