import type { ConsoleMode, Fleet, SettingsReading, VoyageSummary } from "@antumbra/contract";
import { FlagshipPanel } from "#views/flagship.tsx";
import { FleetSurface } from "#views/fleet-surface.tsx";
import { QuayPanel } from "#views/quay.tsx";
import { RulingsPanel } from "#views/rulings.tsx";
import { SettingsPanel } from "#views/settings.tsx";
import { VoyagePanel } from "#views/voyage.tsx";
import { VoyagesAside } from "#views/voyages-aside.tsx";

interface ConsoleProps {
	readonly change: string | undefined;
	readonly fleet: Fleet | undefined;
	readonly mode: ConsoleMode;
	readonly onChange: (changeId: string | undefined) => void;
	readonly onError: (message: string) => void;
	readonly onPiece: (voyageId: string, pieceId: string) => void;
	readonly onSession: (sessionId: string | undefined) => void;
	readonly onSettings: (settings: SettingsReading) => void;
	readonly onVoyage: (voyageId: string) => void;
	readonly piece: string | undefined;
	readonly session: string | undefined;
	readonly settings: SettingsReading | undefined;
	readonly voyage: string | undefined;
	readonly voyages: ReadonlyArray<VoyageSummary>;
}

// why: the aside is a fixed column, not a measuring stick — a long branch or
// path inside it wraps or clips within its width instead of widening the
// window or opening a sideways bar across the whole app.
const ASIDE = "flex w-80 shrink-0 flex-col gap-5 overflow-x-hidden overflow-y-auto border-r border-border p-3";

// why: the settings are read once by the shell and handed to every surface
// that draws by them, so a transcript never opens a read of its own and a
// change made on the Settings page is already in force when the reader
// returns to the fleet.
export const ConsoleMain = (props: ConsoleProps) => {
	const foldToolCalls = props.settings?.settings.foldToolCalls ?? false;
	if (props.mode === "flagship") {
		return <FlagshipPanel fleet={props.fleet} foldToolCalls={foldToolCalls} onError={props.onError} voyages={props.voyages} />;
	}
	if (props.mode === "fleet") {
		return (
			<FleetSurface
				fleet={props.fleet}
				foldToolCalls={foldToolCalls}
				onError={props.onError}
				onPiece={props.onPiece}
				onSelect={props.onSession}
				onVoyage={props.onVoyage}
				session={props.session}
			/>
		);
	}
	if (props.mode === "settings") {
		return <SettingsPanel onError={props.onError} onSettings={props.onSettings} settings={props.settings} />;
	}
	if (props.mode === "quay") {
		return <QuayPanel onError={props.onError} onSelect={props.onChange} selectedId={props.change} />;
	}
	// why: a ruling is answered against its own context and question, not
	// against a voyage, so the rail of voyages would only be a distraction.
	if (props.mode === "rulings") {
		return <RulingsPanel onError={props.onError} />;
	}
	return (
		<div className="flex min-h-0 min-w-0 flex-1">
			<aside className={ASIDE}>
				{/* why: the quay is read against the voyages the work is owed to, so
				the aside keeps listing them rather than emptying itself. */}
				<VoyagesAside
					backends={props.fleet?.backends ?? []}
					onError={props.onError}
					onSelect={props.onVoyage}
					selected={props.voyage}
					voyages={props.voyages}
				/>
			</aside>
			{props.voyage === undefined ? (
				<section className="m-auto text-xs text-muted-foreground">select a voyage to see its pieces</section>
			) : (
				<VoyagePanel onError={props.onError} piece={props.piece} voyageId={props.voyage} />
			)}
		</div>
	);
};
