import type { Fleet, VoyageSummary } from "@antumbra/contract";
import { SessionPane } from "#views/session-pane.tsx";
import { CaptainCall } from "#views/voyage-acts.tsx";

// why: the fleet's highest-level agent is somewhere to talk, not somewhere to
// navigate to — so this opens on the captain's own conversation rather than on
// a dashboard about it, and adds no rail for the admiral to read first.
export const FlagshipPanel = ({
	fleet,
	foldToolCalls,
	onError,
	voyages,
}: {
	readonly fleet: Fleet | undefined;
	readonly foldToolCalls: boolean;
	readonly onError: (message: string) => void;
	readonly voyages: ReadonlyArray<VoyageSummary>;
}) => {
	const flagship = voyages.find((voyage) => voyage.kind === "flagship");
	if (flagship === undefined) {
		return <section className="m-auto text-xs text-muted-foreground">taking a sight…</section>;
	}
	const sessionId = flagship.captain?.sessionId ?? null;
	if (sessionId === null) {
		return (
			<section className="m-auto flex flex-col items-center gap-3">
				<p className="text-xs text-muted-foreground">the flagship captain has no conversation open yet</p>
				<CaptainCall captain={flagship.captain} onError={onError} voyageId={flagship.id} />
			</section>
		);
	}
	return <SessionPane fleet={fleet} foldToolCalls={foldToolCalls} key={sessionId} onError={onError} sessionId={sessionId} />;
};
