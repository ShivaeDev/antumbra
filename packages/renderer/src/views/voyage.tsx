import type { VoyageView } from "@antumbra/contract";
import { useEffect, useState } from "react";
import { watchVoyage } from "#adapters/trpc-voyages.ts";
import { BoardPanel } from "#views/board.tsx";
import { CrewPanel } from "#views/crew.tsx";
import { CharterPieceForm } from "#views/piece-form.tsx";
import { PiecesPanel } from "#views/pieces.tsx";
import { VoyageHeader } from "#views/voyage-header.tsx";

const sectionStyle: React.CSSProperties = {
	display: "flex",
	flex: 1,
	flexDirection: "column",
	gap: "1.2rem",
	minWidth: 0,
	overflowY: "auto",
	padding: "1rem 1.4rem",
};

export const VoyagePanel = ({
	onError,
	voyageId,
}: {
	readonly onError: (message: string) => void;
	readonly voyageId: string;
}) => {
	const [voyage, setVoyage] = useState<VoyageView | undefined>(undefined);
	const [feedError, setFeedError] = useState<string | undefined>(undefined);

	useEffect(() => {
		setVoyage(undefined);
		setFeedError(undefined);
		return watchVoyage(voyageId, setVoyage, setFeedError);
	}, [voyageId]);

	if (voyage === undefined) {
		return (
			<section style={{ color: "#8a8f98", margin: "auto" }}>
				{feedError === undefined
					? "taking a sight…"
					: `feed lost: ${feedError}`}
			</section>
		);
	}
	return (
		<section style={sectionStyle}>
			{feedError === undefined ? null : (
				<div style={{ color: "#ff7c7c" }}>feed lost: {feedError}</div>
			)}
			<VoyageHeader onError={onError} voyage={voyage} />
			<PiecesPanel onError={onError} pieces={voyage.pieces} />
			<CharterPieceForm
				onError={onError}
				pieces={voyage.pieces}
				voyageId={voyage.id}
			/>
			<CrewPanel crew={voyage.crew} />
			<BoardPanel
				entries={voyage.board}
				onError={onError}
				scope={{ kind: "voyage", voyageId: voyage.id }}
			/>
		</section>
	);
};
