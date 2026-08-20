import type { VoyageView } from "@antumbra/contract";
import { watchVoyage } from "#adapters/trpc-voyages.ts";
import { useFeed } from "#hooks/feed.ts";
import { BoardPanel } from "#views/board.tsx";
import { CrewPanel } from "#views/crew.tsx";
import { PiecesPanel } from "#views/pieces.tsx";
import { VoyageHeader } from "#views/voyage-header.tsx";

export const VoyagePanel = ({
	onError,
	voyageId,
}: {
	readonly onError: (message: string) => void;
	readonly voyageId: string;
}) => {
	const { error, value: voyage } = useFeed<VoyageView>(
		voyageId,
		(onVoyage, onFeedError) => watchVoyage(voyageId, onVoyage, onFeedError),
	);

	if (voyage === undefined) {
		return (
			<section className="m-auto text-xs text-muted-foreground">
				{error === undefined ? "taking a sight…" : `feed lost: ${error}`}
			</section>
		);
	}
	return (
		<section className="@container flex min-h-0 min-w-0 flex-1 flex-col font-sans">
			<VoyageHeader onError={onError} voyage={voyage} />
			{error === undefined ? null : (
				<p className="shrink-0 border-b border-destructive/40 bg-destructive/10 px-5 py-1.5 text-xs text-destructive">
					feed lost: {error}
				</p>
			)}
			{/* why: the pane scrolls the one way it was built to scroll; a long
			charter or branch belongs inside its row, never in a sideways bar over
			the whole voyage. */}
			<div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
				<div className="grid min-w-0 grid-cols-1 items-start gap-6 px-5 py-4 @4xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @4xl:gap-8">
					<PiecesPanel
						onError={onError}
						pieces={voyage.pieces}
						voyageId={voyage.id}
					/>
					<div className="flex min-w-0 flex-col gap-6">
						<BoardPanel
							entries={voyage.board}
							onError={onError}
							scope={{ kind: "voyage", voyageId: voyage.id }}
						/>
						<CrewPanel crew={voyage.crew} />
					</div>
				</div>
			</div>
		</section>
	);
};
