import type { PieceView } from "@antumbra/contract";
import { PieceCard } from "#views/piece-card.tsx";
import { CharterPieceForm } from "#views/piece-form.tsx";
import { Section, SectionHeading } from "#views/section.tsx";
import { byLadder } from "#voyages/order.ts";

export const PiecesPanel = ({
	onError,
	pieces,
	selected,
	voyageId,
}: {
	readonly onError: (message: string) => void;
	readonly pieces: ReadonlyArray<PieceView>;
	readonly selected: string | undefined;
	readonly voyageId: string;
}) => (
	<Section>
		<SectionHeading action={<CharterPieceForm onError={onError} pieces={pieces} voyageId={voyageId} />} count={pieces.length} title="Pieces" />
		{pieces.length === 0 ? (
			<p className="text-2xs text-muted-foreground">Nothing chartered yet — charter a piece to give the voyage work</p>
		) : (
			<ul className="flex min-w-0 flex-col gap-2">
				{byLadder(pieces).map((piece) => (
					<li className="min-w-0" key={piece.id}>
						<PieceCard onError={onError} piece={piece} pieces={pieces} selected={piece.id === selected} />
					</li>
				))}
			</ul>
		)}
	</Section>
);
