import type { Fleet } from "@antumbra/contract";
import { FleetPanel } from "#views/fleet.tsx";
import { SessionPane } from "#views/session-pane.tsx";

export const FleetSurface = ({
	fleet,
	onError,
	onSelect,
	session,
}: {
	readonly fleet: Fleet | undefined;
	readonly onError: (message: string) => void;
	readonly onSelect: (sessionId: string | undefined) => void;
	readonly session: string | undefined;
}) => (
	<div className="flex min-h-0 min-w-0 flex-1">
		<FleetPanel
			fleet={fleet}
			onError={onError}
			onSelect={onSelect}
			selected={session}
		/>
		{session === undefined ? null : (
			<SessionPane
				fleet={fleet}
				key={session}
				onClose={() => onSelect(undefined)}
				onError={onError}
				sessionId={session}
			/>
		)}
	</div>
);
