import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import type { SessionsApi } from "#glass.ts";
import { SpendInline } from "#views/spend-inline.tsx";

export const VoyageSpend = ({ api, voyageId }: { readonly api: SessionsApi; readonly voyageId: string }) => (
	<Live query={api.costs.forVoyage} input={{ voyageId: VoyageId.make(voyageId) }} waiting="Reading voyage spend…">
		{(total) =>
			total.turns === 0 ? null : (
				<span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap tabular-nums">
					<span>·</span>
					<SpendInline total={total} />
				</span>
			)
		}
	</Live>
);
