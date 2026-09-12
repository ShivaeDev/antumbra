import { pieceBoard, voyageBoard } from "@antumbra/domain-boards/ids.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { Section } from "@antumbra/glass-components/section.tsx";
import { ChevronDown, ChevronRight } from "lucide-react";
import { type ReactNode, useState } from "react";
import { BoardNodes } from "#board-nodes.tsx";
import type { BoardDisplayApi } from "#display.ts";
import { type BoardOwner, WriteEntry } from "#write-entry.tsx";

const EMPTY = "No entries yet; agents write here as they work";
const EXPLAINER = "Entries newest first; open a summary to see the entries behind it.";

export const BoardPanel = (props: {
	readonly api: BoardDisplayApi;
	readonly owner: BoardOwner;
	readonly name: string;
	readonly onPiece?: (pieceId: string) => void;
	readonly action?: ReactNode;
	readonly status?: ReactNode;
}): ReactNode => {
	const [open, setOpen] = useState(false);
	const board = props.owner.kind === "piece" ? pieceBoard(PieceId.make(props.owner.pieceId)) : voyageBoard(VoyageId.make(props.owner.voyageId));
	const Chevron = open ? ChevronDown : ChevronRight;
	return (
		<Section>
			<div className="flex min-w-0 items-center gap-2 border-b border-border pb-1.5">
				<button
					aria-expanded={open}
					aria-label="Board"
					className="flex min-w-0 flex-1 items-center gap-2 text-left"
					onClick={() => setOpen(!open)}
					title={open ? "Hide the board" : "Show the board"}
					type="button"
				>
					<Chevron className="size-3 shrink-0" />
					<span className="text-xs font-medium">Board</span>
					<Live input={{ board }} query={props.api.boards.entries}>
						{(entries) => <span className="text-2xs text-muted-foreground tabular-nums">{entries.length}</span>}
					</Live>
				</button>
				{props.action}
			</div>
			{props.status}
			{open ? (
				<>
					<BoardContents {...props} board={board} />
					<WriteEntry api={props.api} owner={props.owner} />
				</>
			) : null}
		</Section>
	);
};

const BoardContents = (props: {
	readonly api: BoardDisplayApi;
	readonly board: import("@antumbra/domain-boards/ids.ts").BoardId;
	readonly owner: BoardOwner;
	readonly name: string;
	readonly onPiece?: ((pieceId: string) => void) | undefined;
}) => {
	const noSummary =
		props.owner.kind === "piece"
			? "No summary yet; one is written when the Piece completes"
			: "No summary yet; one is written at the end of each day or when you smooth now";
	const board = props.board;
	return (
		<Live input={{ board }} query={props.api.boards.display}>
			{(entries) =>
				entries.length === 0 ? (
					<p className="text-2xs text-muted-foreground">{EMPTY}</p>
				) : (
					<>
						<p className="text-2xs text-muted-foreground">{EXPLAINER}</p>
						{entries.some((node) => node.entry.kind === "summary") ? null : <p className="text-2xs text-muted-foreground">{noSummary}</p>}
						<BoardNodes api={props.api} depth={0} nodes={entries} name={props.name} onPiece={props.onPiece} />
					</>
				)
			}
		</Live>
	);
};
