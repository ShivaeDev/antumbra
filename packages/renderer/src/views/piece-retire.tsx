import type { PieceView } from "@antumbra/contract";
import { retirePieceCrew } from "#adapters/trpc.ts";
import { Button } from "#components/ui/button.tsx";

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
