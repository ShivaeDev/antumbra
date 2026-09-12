import { Live } from "@antumbra/glass-client/live.tsx";
import { Badge } from "@antumbra/glass-components/ui/badge.tsx";
import { AnchorIcon } from "lucide-react";
import type { SessionsApi } from "#glass.ts";

export const AgentBerths = ({ api, agentId }: { readonly api: SessionsApi; readonly agentId: string }) => (
	<Live query={api.reclamation.berths} input={{ agentId }}>
		{(berths) => (
			<div className="flex min-w-0 flex-col gap-0.5 px-1.5">
				{berths
					.filter((berth) => berth.status !== "reclaimed")
					.map((berth) => (
						<div key={berth.id} className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
							<AnchorIcon className="size-3 shrink-0" />
							<span className="min-w-0 wrap-anywhere">{berth.slug}</span>
							<span className="min-w-0 font-mono wrap-anywhere">{berth.branch}</span>
							{berth.reclaimState === "claimed" ? <Badge variant="warning">reclaiming</Badge> : null}
							{berth.status === "stranded" ? <Badge variant="destructive">stranded</Badge> : null}
						</div>
					))}
			</div>
		)}
	</Live>
);
