import type { captainReading } from "@antumbra/domain-agents/rows/captain-reading.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { cn } from "@antumbra/glass-components/class-names.ts";
import { StatusBadge } from "@antumbra/glass-components/compositions/status-badge.tsx";
import { Button } from "@antumbra/glass-components/shadcn/button.tsx";
import type { VoyagesDisplayApi } from "#display.ts";

type Captain = typeof captainReading.Row.Type;

const NOT_HAILED = "Not hailed yet.";

export const CaptainAct = (props: { readonly api: VoyagesDisplayApi; readonly voyageId: string; readonly onHail: (voyageId: string) => void }) => (
	<Live input={{ voyageId: VoyageId.make(props.voyageId) }} query={props.api.agents.captainReading}>
		{(captain) => (
			<Button disabled={captain !== null && !captain.canHail} onClick={() => props.onHail(props.voyageId)} size="sm">
				{captain?.status === "alive" ? "Wake the captain" : "Hail a captain"}
			</Button>
		)}
	</Live>
);

export const CaptainLine = (props: {
	readonly api: VoyagesDisplayApi;
	readonly voyageId: string;
	readonly agentId?: string | undefined;
	readonly onAgent: (agentId: string) => void;
}) => (
	<Live input={{ voyageId: VoyageId.make(props.voyageId) }} query={props.api.agents.captainReading}>
		{(captain) => <Line agentId={props.agentId} captain={captain} onAgent={props.onAgent} />}
	</Live>
);

const Line = (props: { readonly agentId?: string | undefined; readonly captain: Captain | null; readonly onAgent: (agentId: string) => void }) => {
	const captain = props.captain;
	const agentId = captain?.agentId ?? null;
	if (captain === null || agentId === null) return <p className="text-xs text-muted-foreground">{captain?.standing ?? NOT_HAILED}</p>;
	const showing = props.agentId === agentId;
	return (
		<button
			aria-current={showing ? "true" : undefined}
			aria-label={`Open the captain ${agentId}`}
			className={cn(
				"flex h-8 w-full min-w-0 items-center gap-2 rounded-md px-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60",
				showing && "bg-accent",
			)}
			onClick={() => props.onAgent(agentId)}
			type="button"
		>
			<span className="min-w-0 truncate font-mono text-xs text-muted-foreground">{agentId}</span>
			<span className="ml-auto shrink-0">
				<StatusBadge state={captain.standing} />
			</span>
		</button>
	);
};
