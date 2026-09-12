import type { PieceView } from "@antumbra/contract";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
import { retirePieceCrew } from "#adapters/trpc.ts";

export const PieceRetire = ({ onError, piece }: { readonly onError: (message: string) => void; readonly piece: PieceView }) => {
	if (!piece.canRetireCrew) {
		return null;
	}
	return (
		<Button className="self-start" onClick={() => retirePieceCrew(piece.id, onError)} size="sm" type="button" variant="outline">
			Retire crew
		</Button>
	);
};
