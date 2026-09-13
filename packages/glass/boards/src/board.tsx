import { pieceBoard, voyageBoard } from "@antumbra/domain-boards/ids.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@antumbra/glass-components/shadcn/collapsible.tsx";
import { ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import { BoardNodes } from "#board-nodes.tsx";
import type { BoardDisplayApi } from "#display.ts";
import { type BoardOwner, WriteEntry } from "#write-entry.tsx";

const EMPTY = "No entries yet; agents write here as they work.";
const EXPLAINER = "Entries newest first; open a summary to see the entries behind it.";
const LOG = "Log";

export const BoardPanel = (props: {
	readonly api: BoardDisplayApi;
	readonly owner: BoardOwner;
	readonly name: string;
	readonly onPiece?: (pieceId: string) => void;
	readonly action?: ReactNode;
	readonly status?: ReactNode;
}): ReactNode => {
	const board = props.owner.kind === "piece" ? pieceBoard(PieceId.make(props.owner.pieceId)) : voyageBoard(VoyageId.make(props.owner.voyageId));
	return (
		<Collapsible className="group flex min-w-0 flex-col gap-2">
			<div className="flex min-w-0 items-center gap-2">
				<CollapsibleTrigger aria-label={LOG} className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
					<ChevronRightIcon className="size-4 shrink-0 group-data-[state=open]:rotate-90" />
					{LOG}
					<Live input={{ board }} query={props.api.boards.entries}>
						{(entries) => <span className="tabular-nums">{entries.length}</span>}
					</Live>
				</CollapsibleTrigger>
				{props.action}
				{props.status}
			</div>
			<CollapsibleContent className="flex min-w-0 flex-col gap-3">
				<BoardContents {...props} board={board} />
				<WriteEntry api={props.api} owner={props.owner} />
			</CollapsibleContent>
		</Collapsible>
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
					<p className="text-xs text-muted-foreground">{EMPTY}</p>
				) : (
					<>
						<p className="text-xs text-muted-foreground">{EXPLAINER}</p>
						{entries.some((node) => node.entry.kind === "summary") ? null : <p className="text-xs text-muted-foreground">{noSummary}</p>}
						<BoardNodes api={props.api} depth={0} nodes={entries} name={props.name} onPiece={props.onPiece} />
					</>
				)
			}
		</Live>
	);
};
