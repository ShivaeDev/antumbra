import { Live } from "@antumbra/glass-client/live.tsx";
import { ReposDialog } from "@antumbra/glass-repos/repos-dialog.tsx";
import type { SessionsClient } from "#client.ts";
import type { SessionsApi } from "#glass.ts";
import { Roster } from "#roster.tsx";
import { SpawnDialog } from "#spawn-dialog.tsx";

export const FleetPanel = (props: {
	readonly api: SessionsApi;
	readonly sessions: SessionsClient;
	readonly sessionId?: string | undefined;
	readonly onSession: (id: string) => void;
	readonly onOpenTranscript?: ((id: string) => void) | undefined;
	readonly onPiece: (voyageId: string, pieceId: string) => void;
	readonly onVoyage: (id: string) => void;
}) => (
	<section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
		<div className="flex flex-wrap items-center gap-2">
			<h2 className="min-w-0 flex-1 text-base">Fleet</h2>
			<ReposDialog api={props.api} />
			<SpawnDialog api={props.api} />
		</div>
		<Live query={props.api.agents.roster} input={{}} waiting="Reading the fleet…">
			{(agents) =>
				agents.length === 0 ? (
					<p className="text-xs text-muted-foreground">No agents yet — spawn one to put it here</p>
				) : (
					<Roster {...props} agents={agents} />
				)
			}
		</Live>
	</section>
);
