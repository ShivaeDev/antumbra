import type { Fleet } from "@antumbra/contract";
import { FleetPanel } from "#views/fleet.tsx";
import { ReposPanel } from "#views/repos.tsx";
import { SpawnForm } from "#views/spawn-form.tsx";

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
		<ReposPanel onError={onError} repos={fleet?.repos ?? []} />
		<SpawnForm backends={fleet?.backends ?? []} onError={onError} />
		<FleetPanel
			fleet={fleet}
			onError={onError}
			onSelect={onSelect}
			selected={selected}
		/>
	</>
);
