import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
import type { VoyagesDisplayApi } from "#display.ts";

export const CaptainCall = (props: { readonly api: VoyagesDisplayApi; readonly voyageId: string; readonly onHail: (voyageId: string) => void }) => (
	<Live input={{ voyageId: VoyageId.make(props.voyageId) }} query={props.api.agents.captainReading}>
		{(captain) =>
			captain === null || captain.canHail ? (
				<Button onClick={() => props.onHail(props.voyageId)} size="sm" variant="outline">
					{captain?.status === "alive" ? "Wake the captain" : "Hail a captain"}
				</Button>
			) : (
				<span className="flex min-w-0 items-center gap-1.5 text-2xs text-muted-foreground">
					<span>Captain</span>
					<span className="truncate font-mono">{captain.agentId?.slice(0, 8)}</span>
					<span>· {captain.standing}</span>
				</span>
			)
		}
	</Live>
);
