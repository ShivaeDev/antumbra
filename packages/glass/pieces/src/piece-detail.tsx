import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import type { piece as Piece } from "@antumbra/domain-pieces/rows/piece.ts";
import type { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { ArtifactOutcomes } from "@antumbra/glass-artifacts/artifact-outcomes.tsx";
import { BoardPanel } from "@antumbra/glass-boards/board.tsx";
import { ChangeOutcomes } from "@antumbra/glass-changes/change-outcomes.tsx";
import { Live } from "@antumbra/glass-client/live.tsx";
import { MarkdownView } from "@antumbra/glass-components/markdown-view.tsx";
import { Badge } from "@antumbra/glass-components/ui/badge.tsx";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
import { ReportOutcomes } from "@antumbra/glass-reports/report-outcomes.tsx";
import type { PieceDisplayActions, PiecesDisplayApi } from "#display.ts";
import { PieceActs } from "#piece-acts.tsx";
import { RewirePiece } from "#rewire-piece.tsx";

type Props = PieceDisplayActions & { readonly api: PiecesDisplayApi; readonly pieceId: string };
type Progress = typeof pieceProgress.Row.Type;
const DetailContents = (props: Props & { readonly piece: typeof Piece.Row.Type }) => {
	const piece = props.piece;
	const id = piece.id;
	return (
		<div className="flex min-w-0 flex-col gap-2 border-t border-border px-2.5 py-2">
			{piece.charter === "" ? null : <MarkdownView className="text-xs" markdown={piece.charter} />}
			<Live input={{ id }} query={props.api.pieces.dependencies}>
				{(dependencies) => (
					<>
						{dependencies.length === 0 ? null : (
							<p className="text-2xs text-muted-foreground">Depends on: {dependencies.map((dependency) => dependency.title).join(", ")}</p>
						)}
					</>
				)}
			</Live>
			<Live input={{ pieceIds: [id] }} query={props.api.rulings.openGates}>
				{(gates) =>
					gates.map((gate) => (
						<p className="text-2xs text-muted-foreground" key={gate.id}>
							Awaiting ruling {gate.rulingId}: {gate.question}
						</p>
					))
				}
			</Live>
			<PieceCrew api={props.api} pieceId={id} />
			<BoardPanel api={props.api} name={piece.title} owner={{ kind: "piece", pieceId: id }} />
			<div className="flex min-w-0 flex-col gap-2">
				<ReportOutcomes api={props.api} pieceId={id} />
				<ArtifactOutcomes api={props.api} openWindow={props.openArtifact} pieceId={id} read={props.readArtifact} />
				<ChangeOutcomes api={props.api} pieceId={id} />
			</div>
			<Live input={{ id }} query={props.api.pieces.progress}>
				{(progress) => <PieceControls api={props.api} onWorkNow={props.onWorkNow} piece={piece} progress={progress} />}
			</Live>
			<Live input={{ id }} query={props.api.pieces.dependencies}>
				{(dependencies) => <RewirePiece api={props.api} piece={{ ...piece, dependsOn: dependencies.map((dependency) => dependency.id) }} />}
			</Live>
			<Live input={{ pieceId: id }} query={props.api.agents.canRetireCrew}>
				{(canRetire) =>
					canRetire ? (
						<Button className="self-start" onClick={() => props.onRetireCrew(id)} size="sm" variant="outline">
							Retire crew
						</Button>
					) : null
				}
			</Live>
		</div>
	);
};
export const PieceDetail = (props: Props) => (
	<Live input={{ id: PieceId.make(props.pieceId) }} query={props.api.pieces.byId}>
		{(piece) => (piece === null ? <p>No such piece</p> : <DetailContents {...props} piece={piece} />)}
	</Live>
);

const PieceCrew = (props: { readonly api: PiecesDisplayApi; readonly pieceId: PieceId }) => {
	const id = props.pieceId;
	return (
		<Live input={{ pieceId: id }} query={props.api.agents.byPiece}>
			{(agents) => (
				<div className="flex flex-wrap gap-1">
					{agents.map((agent) => (
						<Badge key={agent.id} variant="outline">
							<span className="font-mono">{agent.id}</span> · {agent.status}
						</Badge>
					))}
				</div>
			)}
		</Live>
	);
};

const PieceControls = (props: {
	readonly api: PiecesDisplayApi;
	readonly onWorkNow: (pieceId: string) => void;
	readonly piece: typeof Piece.Row.Type;
	readonly progress: Progress | null;
}) => {
	const progress = props.progress;
	const movable = progress !== null && !progress.settledDone && !progress.abandoned;
	return (
		<div className="flex flex-wrap gap-1.5">
			<PieceActs api={props.api} movable={movable} piece={props.piece} />
			{movable ? (
				<Button onClick={() => props.onWorkNow(props.piece.id)} size="sm" variant="outline">
					Work now
				</Button>
			) : null}
		</div>
	);
};
