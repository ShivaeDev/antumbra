import type { PieceView } from "@antumbra/contract";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
import { workPieceNow } from "#adapters/trpc-voyages.ts";
import { worksNow } from "#voyages/acts.ts";

export const WorkNowAct = ({ onError, piece }: { readonly onError: (message: string) => void; readonly piece: PieceView }) => {
	if (!worksNow(piece)) {
		return null;
	}
	return (
		<Button onClick={() => workPieceNow(piece.id, onError)} size="sm" type="button" variant="outline">
			Work now
		</Button>
	);
};
