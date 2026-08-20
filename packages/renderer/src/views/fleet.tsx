import type { Fleet } from "@antumbra/contract";
import { rosterGroups } from "#fleet/roster.ts";
import { FleetDiagChips } from "#views/diagnostics.tsx";
import { FleetToolbar } from "#views/fleet-toolbar.tsx";
import { RosterGroupPanel } from "#views/roster-group.tsx";

const Roster = ({
	fleet,
	onError,
	onSelect,
	selected,
}: {
	readonly fleet: Fleet | undefined;
	readonly onError: (message: string) => void;
	readonly onSelect: (sessionId: string) => void;
	readonly selected: string | undefined;
}) => {
	if (fleet === undefined) {
		return (
			<span className="text-xs text-muted-foreground">taking a sight…</span>
		);
	}
	if (fleet.agents.length === 0) {
		return (
			<span className="text-xs text-muted-foreground">
				No agents yet — spawn one to put it here
			</span>
		);
	}
	return (
		<>
			{rosterGroups(fleet.agents).map((group) => (
				<RosterGroupPanel
					group={group}
					key={group.standing}
					onError={onError}
					onSelect={onSelect}
					selected={selected}
				/>
			))}
		</>
	);
};

export const FleetPanel = ({
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
	<section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
		<FleetToolbar fleet={fleet} onError={onError} />
		{fleet === undefined ? null : <FleetDiagChips diag={fleet.diag} />}
		<Roster
			fleet={fleet}
			onError={onError}
			onSelect={onSelect}
			selected={selected}
		/>
	</section>
);
