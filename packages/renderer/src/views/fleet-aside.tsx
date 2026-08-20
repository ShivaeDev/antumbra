import type { Fleet } from "@antumbra/contract";
import { FleetPanel } from "#views/fleet.tsx";
import { FleetToolbar } from "#views/fleet-toolbar.tsx";

export const FleetAside = ({
	fleet,
	onError,
	onSelect,
	selected,
}: {
	readonly fleet: Fleet | undefined;
	readonly onError: (message: string) => void;
	readonly onSelect: (sessionId: string) => void;
	readonly selected: string | undefined;
}) => (
	<>
		<FleetToolbar fleet={fleet} onError={onError} />
		<FleetPanel
			fleet={fleet}
			onError={onError}
			onSelect={onSelect}
			selected={selected}
		/>
	</>
);
