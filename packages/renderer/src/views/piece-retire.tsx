import type { PieceView } from "@antumbra/contract";
import { retirePieceCrew } from "#adapters/trpc.ts";
import { Button } from "#components/ui/button.tsx";

// why: the act acknowledges what the piece already says rather than declaring
// it — landed, and its hands gone quiet. Both halves of that are the domain's
// own judgment, published as one capability, so the control is withheld rather
// than shown disabled: a crew still speaking is not something the admiral
// could do anything about from here.
export const PieceRetire = ({
	onError,
	piece,
}: {
	readonly onError: (message: string) => void;
	readonly piece: PieceView;
}) => {
	if (!piece.canRetireCrew) {
		return null;
	}
	return (
		<Button
			className="self-start"
			onClick={() => retirePieceCrew(piece.id, onError)}
			size="sm"
			type="button"
			variant="outline"
		>
			Retire crew
		</Button>
	);
};
