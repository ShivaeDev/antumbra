import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { CommandForm } from "@antumbra/glass-components/form.tsx";
import type { ReactNode } from "react";
import type { PiecesApi } from "#glass.ts";

const SUBMIT = "Charter piece";

export const CharterPiece = (props: { readonly api: PiecesApi; readonly onChartered: () => void; readonly voyageId: string }): ReactNode => (
	<CommandForm
		command={props.api.pieces.charter}
		fixed={{ voyageId: VoyageId.make(props.voyageId) }}
		heading={false}
		sent={props.onChartered}
		submit={SUBMIT}
		titles
	/>
);
