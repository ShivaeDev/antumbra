import type { Fleet } from "@antumbra/contract";
import { FleetPanel } from "#views/fleet.tsx";
import { SessionPane } from "#views/session-pane.tsx";

export const FleetSurface = ({
	fleet,
	foldToolCalls,
	onError,
	onPiece,
	onSelect,
	onVoyage,
	session,
}: {
	readonly fleet: Fleet | undefined;
	readonly foldToolCalls: boolean;
	readonly onError: (message: string) => void;
	readonly onPiece: (voyageId: string, pieceId: string) => void;
	readonly onSelect: (sessionId: string | undefined) => void;
	readonly onVoyage: (voyageId: string) => void;
	readonly session: string | undefined;
}) => (
	<div className="flex min-h-0 min-w-0 flex-1">
		<FleetPanel fleet={fleet} onError={onError} onPiece={onPiece} onSelect={onSelect} onVoyage={onVoyage} selected={session} />
		{session === undefined ? null : (
			<SessionPane
				fleet={fleet}
				foldToolCalls={foldToolCalls}
				key={session}
				onClose={() => onSelect(undefined)}
				onError={onError}
				sessionId={session}
			/>
		)}
	</div>
);
