import { QuayPanel } from "@antumbra/glass-changes/quay-panel.tsx";
import { HoldsPanel } from "@antumbra/glass-holds/holds.tsx";
import { RulingsPanel } from "@antumbra/glass-rulings/rulings.tsx";
import { CostsPanel } from "@antumbra/glass-sessions/costs.tsx";
import { FleetPanel } from "@antumbra/glass-sessions/fleet.tsx";
import { SessionPane } from "@antumbra/glass-sessions/session-pane.tsx";
import { Flagship } from "@antumbra/glass-voyages/flagship.tsx";
import type { ConsolePlace } from "@antumbra/platform-shell/windows.ts";
import { VoyagesPage } from "#navigation/voyages.tsx";
import type { RendererProps } from "#props.ts";
import { SettingsPanel } from "#settings/settings.tsx";

export const ConsoleMain = (
	props: RendererProps & {
		readonly place: ConsolePlace;
		readonly foldToolCalls: boolean;
		readonly onPlace: (place: ConsolePlace) => void;
		readonly onError: (message: string) => void;
	},
) => {
	const session = (sessionId: string) => (
		<SessionPane
			api={props.api}
			inputs={props.inputs}
			sessions={props.sessions}
			drafts={props.drafts}
			sessionId={sessionId}
			foldToolCalls={props.foldToolCalls}
			onError={props.onError}
		/>
	);
	switch (props.place.mode) {
		case "flagship":
			return <Flagship api={props.api} renderSession={session} />;
		case "fleet":
			return (
				<div className="flex min-h-0 min-w-0 flex-1">
					<FleetPanel
						api={props.api}
						sessions={props.sessions}
						sessionId={props.place.sessionId ?? undefined}
						onSession={(sessionId) => props.onPlace({ ...props.place, sessionId })}
						onPiece={(voyageId, pieceId) => props.onPlace({ ...props.place, mode: "voyages", voyageId, pieceId })}
						onVoyage={(voyageId) => props.onPlace({ ...props.place, mode: "voyages", voyageId, pieceId: null })}
					/>
					{props.place.sessionId === null ? null : session(props.place.sessionId)}
				</div>
			);
		case "settings":
			return <SettingsPanel {...props} />;
		case "quay":
			return (
				<QuayPanel
					api={props.api}
					selectedId={props.place.changeId ?? undefined}
					onSelect={(changeId) => props.onPlace({ ...props.place, changeId: changeId ?? null })}
				/>
			);
		case "rulings":
			return <RulingsPanel api={props.api} />;
		case "costs":
			return <CostsPanel api={props.api} />;
		case "holds":
			return <HoldsPanel api={props.api} />;
		case "voyages":
			return <VoyagesPage {...props} />;
	}
};
