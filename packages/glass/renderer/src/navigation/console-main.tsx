import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { QuayPanel } from "@antumbra/glass-changes/quay-panel.tsx";
import { HoldsPanel } from "@antumbra/glass-holds/holds.tsx";
import { RulingsPanel } from "@antumbra/glass-rulings/rulings.tsx";
import { CostsPanel } from "@antumbra/glass-sessions/costs.tsx";
import { FleetPanel } from "@antumbra/glass-sessions/fleet.tsx";
import { SessionPane } from "@antumbra/glass-sessions/session-pane.tsx";
import { Flagship } from "@antumbra/glass-voyages/flagship.tsx";
import type { ConsolePlace } from "@antumbra/platform-shell/windows.ts";
import { Cause, Effect } from "effect";
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
	const hail = (voyageId: string) => {
		Effect.runFork(
			props.api.agents
				.hail({ voyageId: VoyageId.make(voyageId) })
				.pipe(Effect.catchCause((cause) => Effect.sync(() => props.onError(Cause.pretty(cause))))),
		);
	};
	const openTranscript = (sessionId: string) => {
		Effect.runFork(
			props.shell.open({ role: "transcript", sessionId }).pipe(Effect.catchCause((cause) => Effect.sync(() => props.onError(Cause.pretty(cause))))),
		);
	};
	const session = (sessionId: string, onClose?: () => void) => (
		<SessionPane
			api={props.api}
			inputs={props.inputs}
			sessions={props.sessions}
			drafts={props.drafts}
			sessionId={sessionId}
			key={sessionId}
			onClose={onClose}
			foldToolCalls={props.foldToolCalls}
			onError={props.onError}
		/>
	);
	switch (props.place.mode) {
		case "flagship":
			return <Flagship api={props.api} renderSession={session} onHail={hail} />;
		case "fleet":
			return (
				<div className="flex min-h-0 min-w-0 flex-1">
					<FleetPanel
						api={props.api}
						sessions={props.sessions}
						onOpenTranscript={openTranscript}
						sessionId={props.place.sessionId ?? undefined}
						onSession={(sessionId) => props.onPlace({ ...props.place, sessionId })}
						onPiece={(voyageId, pieceId) => props.onPlace({ ...props.place, mode: "voyages", voyageId, pieceId })}
						onVoyage={(voyageId) => props.onPlace({ ...props.place, mode: "voyages", voyageId, pieceId: null })}
					/>
					{props.place.sessionId === null ? null : session(props.place.sessionId, () => props.onPlace({ ...props.place, sessionId: null }))}
				</div>
			);
		case "settings":
			return <SettingsPanel {...props} />;
		case "quay":
			return (
				<QuayPanel
					api={props.api}
					selectedId={props.place.changeId ?? undefined}
					onOpenSession={openTranscript}
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
