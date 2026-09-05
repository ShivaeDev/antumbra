import type { ConsoleMode, Fleet, SettingsReading, VoyageSummary } from "@antumbra/contract";
import { CostsPanel } from "#views/costs.tsx";
import { FlagshipPanel } from "#views/flagship.tsx";
import { FleetSurface } from "#views/fleet-surface.tsx";
import { HoldsPanel } from "#views/holds.tsx";
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

const ASIDE = "flex w-80 shrink-0 flex-col gap-5 overflow-x-hidden overflow-y-auto border-r border-border p-3";

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
	if (props.mode === "rulings") {
		return <RulingsPanel />;
	}
	if (props.mode === "costs") {
		return <CostsPanel />;
	}
	if (props.mode === "holds") {
		return <HoldsPanel onError={props.onError} onSettings={props.onSettings} settings={props.settings} />;
	}
	return (
		<div className="flex min-h-0 min-w-0 flex-1">
			<aside className={ASIDE}>
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
