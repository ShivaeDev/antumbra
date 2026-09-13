import type { captainReading } from "@antumbra/domain-agents/rows/captain-reading.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { cn } from "@antumbra/glass-components/class-names.ts";
import { SUBJECT } from "@antumbra/glass-components/classes.ts";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
import type { ReactNode } from "react";
import type { VoyagesDisplayApi } from "#display.ts";

type Captain = typeof captainReading.Row.Type;

const LINE = "flex min-w-0 items-center gap-1.5 text-2xs text-muted-foreground";

interface Props {
	readonly api: VoyagesDisplayApi;
	readonly voyageId: string;
	readonly onHail: (voyageId: string) => void;
	readonly agentId?: string | undefined;
	readonly onAgent?: ((agentId: string) => void) | undefined;
}

export const CaptainCall = (props: Props) => (
	<Live input={{ voyageId: VoyageId.make(props.voyageId) }} query={props.api.agents.captainReading}>
		{(captain) => <CaptainLine {...props} captain={captain} />}
	</Live>
);

const CaptainLine = (props: Props & { readonly captain: Captain | null }) => {
	const captain = props.captain;
	const agentId = captain?.agentId ?? null;
	const onAgent = props.onAgent;
	if (captain === null || agentId === null) return <Hail captain={captain} onHail={props.onHail} voyageId={props.voyageId} />;
	if (onAgent === undefined) {
		if (!captain.atWork) return <Hail captain={captain} onHail={props.onHail} voyageId={props.voyageId} />;
		return <span className={LINE}>{captainWords(captain, agentId)}</span>;
	}
	return (
		<span className="flex min-w-0 items-center gap-2">
			<button
				aria-current={props.agentId === agentId ? "true" : undefined}
				aria-label={`Open the captain ${agentId}`}
				className={cn(SUBJECT, LINE, "flex-row rounded-md px-1 py-0.5", props.agentId === agentId && "bg-accent")}
				onClick={() => onAgent(agentId)}
				type="button"
			>
				{captainWords(captain, agentId)}
			</button>
			{captain.atWork ? null : <Hail captain={captain} onHail={props.onHail} voyageId={props.voyageId} />}
		</span>
	);
};

const captainWords = (captain: Captain, agentId: string): ReactNode => (
	<>
		<span>Captain</span>
		<span className="truncate font-mono">{agentId}</span>
		<span>· {captain.standing}</span>
	</>
);

const Hail = (props: { readonly captain: Captain | null; readonly voyageId: string; readonly onHail: (voyageId: string) => void }) => (
	<Button disabled={props.captain !== null && !props.captain.canHail} onClick={() => props.onHail(props.voyageId)} size="sm" variant="outline">
		{props.captain?.status === "alive" ? "Wake the captain" : "Hail a captain"}
	</Button>
);
