import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { CommandAct } from "@antumbra/glass-components/act.tsx";
import { ROW } from "@antumbra/glass-components/classes.ts";
import type { ReactNode } from "react";
import type { PiecesApi } from "#glass.ts";

export interface Acting {
	readonly id: string;
	readonly launchedAt: string | null;
	readonly parkedAt: string | null;
}

export const PieceActs = (props: { readonly api: PiecesApi; readonly piece: Acting }): ReactNode => {
	const input = { id: PieceId.make(props.piece.id) };
	return (
		<span className={ROW}>
			{props.piece.launchedAt === null ? <CommandAct command={props.api.pieces.launch} input={input} label="Launch" /> : null}
			{props.piece.parkedAt === null ? (
				<CommandAct command={props.api.pieces.park} input={input} label="Park" />
			) : (
				<CommandAct command={props.api.pieces.unpark} input={input} label="Unpark" />
			)}
		</span>
	);
};
