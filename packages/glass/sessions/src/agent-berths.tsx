import { Live } from "@antumbra/glass-client/live.tsx";
import { StatusBadge } from "@antumbra/glass-components/compositions/status-badge.tsx";
import { AnchorIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { SessionsApi } from "#glass.ts";

const berthPath = (slug: string, branch: string): readonly ReactNode[] => {
	const shown: ReactNode[] = [`${slug} `];
	let index = 0;
	for (const segment of branch.split("/")) {
		if (index > 0) {
			shown.push("/", <wbr key={index} />);
		}
		shown.push(segment);
		index += 1;
	}
	return shown;
};

export const AgentBerths = ({ api, agentId }: { readonly api: SessionsApi; readonly agentId: string }) => (
	<Live query={api.reclamation.berths} input={{ agentId }}>
		{(berths) => {
			const moored = berths.filter((berth) => berth.status !== "reclaimed");
			if (moored.length === 0) return null;
			return (
				<div className="flex min-w-0 flex-col gap-1">
					{moored.map((berth) => (
						<div key={berth.id} className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
							<AnchorIcon className="size-3 shrink-0" />
							<span className="min-w-0 font-mono">{berthPath(berth.slug, berth.branch)}</span>
							{berth.reclaimState === "claimed" ? <StatusBadge state="reclaiming" /> : null}
							{berth.status === "stranded" ? <StatusBadge state="stranded" /> : null}
						</div>
					))}
				</div>
			);
		}}
	</Live>
);
