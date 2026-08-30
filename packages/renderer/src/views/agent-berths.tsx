import type { BerthSummary } from "@antumbra/contract";
import { AnchorIcon } from "lucide-react";
import { Badge } from "#components/ui/badge.tsx";

const BerthMark = ({ berth }: { readonly berth: BerthSummary }) => {
	if (berth.reclaimState === "claimed") {
		return <Badge variant="warning">reclaiming</Badge>;
	}
	if (berth.status === "stranded") {
		return <Badge variant="destructive">stranded</Badge>;
	}
	return null;
};

export const AgentBerths = ({ berths }: { readonly berths: ReadonlyArray<BerthSummary> }) => {
	const moored = berths.filter((berth) => berth.status !== "reclaimed");
	return moored.length === 0 ? null : (
		<div className="flex min-w-0 flex-col gap-0.5 px-1.5">
			{moored.map((berth) => (
				<div className="flex min-w-0 items-center gap-1.5 text-2xs text-muted-foreground" key={berth.slug}>
					<AnchorIcon className="size-3 shrink-0" />
					<span className="min-w-0 wrap-anywhere">{berth.slug}</span>
					<span className="min-w-0 font-mono wrap-anywhere">{berth.branch}</span>
					<BerthMark berth={berth} />
				</div>
			))}
		</div>
	);
};
