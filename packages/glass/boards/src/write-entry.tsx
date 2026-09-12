import { pieceBoard, voyageBoard } from "@antumbra/domain-boards/ids.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { CommandForm } from "@antumbra/glass-components/form.tsx";
import type { ReactNode } from "react";
import type { BoardsApi } from "#glass.ts";

const SUBMIT = "Write";

export type BoardOwner = { readonly kind: "piece"; readonly pieceId: string } | { readonly kind: "voyage"; readonly voyageId: string };

const boardOf = (owner: BoardOwner) =>
	owner.kind === "piece" ? pieceBoard(PieceId.make(owner.pieceId)) : voyageBoard(VoyageId.make(owner.voyageId));

export const WriteEntry = (props: { readonly api: BoardsApi; readonly owner: BoardOwner }): ReactNode => (
	<CommandForm command={props.api.boards.write} fixed={{ author: null, board: boardOf(props.owner) }} submit={SUBMIT} titles />
);
