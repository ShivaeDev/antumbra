import type { Fleet, VoyageSummary } from "@antumbra/contract";
import { FleetAside } from "#views/fleet-aside.tsx";
import type { Mode } from "#views/mode-nav.tsx";
import { QuayPanel } from "#views/quay.tsx";
import { SessionMessage } from "#views/session-message.tsx";
import { TranscriptView } from "#views/transcript.tsx";
import { VoyagePanel } from "#views/voyage.tsx";
import { VoyagesAside } from "#views/voyages-aside.tsx";

const EMPTY = "m-auto text-xs text-muted-foreground";

interface SurfaceProps {
	readonly fleet: Fleet | undefined;
	readonly mode: Mode;
	readonly onError: (message: string) => void;
	readonly onSession: (sessionId: string) => void;
	readonly onVoyage: (voyageId: string) => void;
	readonly session: string | undefined;
	readonly voyage: string | undefined;
	readonly voyages: ReadonlyArray<VoyageSummary>;
}

const MainSection = (props: SurfaceProps) => {
	if (props.mode === "quay") {
		return <QuayPanel onError={props.onError} />;
	}
	if (props.mode === "voyages") {
		return props.voyage === undefined ? (
			<section className={EMPTY}>select a voyage to see its pieces</section>
		) : (
			<VoyagePanel onError={props.onError} voyageId={props.voyage} />
		);
	}
	return props.session === undefined ? (
		<section className={EMPTY}>
			select a session to watch its transcript
		</section>
	) : (
		<section className="flex min-w-0 flex-1 flex-col">
			<TranscriptView sessionId={props.session} />
			<SessionMessage
				fleet={props.fleet}
				onError={props.onError}
				sessionId={props.session}
			/>
		</section>
	);
};

// why: the aside is a fixed column, not a measuring stick — a long branch or
// path inside it wraps or clips within its width instead of widening the
// window or opening a sideways bar across the whole app.
const ASIDE =
	"flex w-80 shrink-0 flex-col gap-5 overflow-x-hidden overflow-y-auto border-r border-border p-3";

const Aside = (props: SurfaceProps) =>
	props.mode === "fleet" ? (
		<FleetAside
			fleet={props.fleet}
			onError={props.onError}
			onSelect={props.onSession}
			selected={props.session}
		/>
	) : (
		// why: the quay is read against the voyages the work is owed to, so the
		// aside keeps listing them rather than emptying itself.
		<VoyagesAside
			backends={props.fleet?.backends ?? []}
			onError={props.onError}
			onSelect={props.onVoyage}
			selected={props.voyage}
			voyages={props.voyages}
		/>
	);

export const ModeSurface = (props: SurfaceProps) => (
	<div className="flex min-h-0 min-w-0 flex-1">
		<aside className={ASIDE}>
			<Aside {...props} />
		</aside>
		<MainSection {...props} />
	</div>
);
