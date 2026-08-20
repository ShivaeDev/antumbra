import type { Fleet, VoyageSummary } from "@antumbra/contract";
import { FleetSurface } from "#views/fleet-surface.tsx";
import type { Mode } from "#views/mode-nav.tsx";
import { QuayPanel } from "#views/quay.tsx";
import { VoyagePanel } from "#views/voyage.tsx";
import { VoyagesAside } from "#views/voyages-aside.tsx";

interface ConsoleProps {
	readonly fleet: Fleet | undefined;
	readonly mode: Mode;
	readonly onError: (message: string) => void;
	readonly onSession: (sessionId: string | undefined) => void;
	readonly onVoyage: (voyageId: string) => void;
	readonly session: string | undefined;
	readonly voyage: string | undefined;
	readonly voyages: ReadonlyArray<VoyageSummary>;
}

const MainSection = (props: ConsoleProps) => {
	if (props.mode === "quay") {
		return <QuayPanel onError={props.onError} />;
	}
	return props.voyage === undefined ? (
		<section className="m-auto text-xs text-muted-foreground">
			select a voyage to see its pieces
		</section>
	) : (
		<VoyagePanel onError={props.onError} voyageId={props.voyage} />
	);
};

// why: the aside is a fixed column, not a measuring stick — a long branch or
// path inside it wraps or clips within its width instead of widening the
// window or opening a sideways bar across the whole app.
const ASIDE =
	"flex w-80 shrink-0 flex-col gap-5 overflow-x-hidden overflow-y-auto border-r border-border p-3";

export const ConsoleMain = (props: ConsoleProps) =>
	props.mode === "fleet" ? (
		<FleetSurface
			fleet={props.fleet}
			onError={props.onError}
			onSelect={props.onSession}
			session={props.session}
		/>
	) : (
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
			<MainSection {...props} />
		</div>
	);
