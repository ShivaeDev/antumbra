import { CommandForm } from "@antumbra/glass-components/form.tsx";
import type { ReactNode } from "react";
import type { PiecesApi } from "#glass.ts";

const SUBMIT = "Save position";

export type Wired = {
	readonly dependsOn: readonly string[];
	readonly id: string;
	readonly title: string;
	readonly voyageId: string;
};

export const RewirePiece = (props: { readonly api: PiecesApi; readonly piece: Wired }): ReactNode => (
	<CommandForm command={props.api.pieces.rewire} label={props.piece.title} row={props.piece} submit={SUBMIT} />
);
