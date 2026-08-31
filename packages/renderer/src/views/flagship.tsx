import type { Fleet, VoyageSummary } from "@antumbra/contract";
import { SessionPane } from "#views/session-pane.tsx";
import { CaptainCall } from "#views/voyage-acts.tsx";

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
