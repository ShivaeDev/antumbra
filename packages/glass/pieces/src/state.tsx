import type { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { StatusBadge } from "@antumbra/glass-components/compositions/status-badge.tsx";

type State = typeof pieceProgress.Row.Type.state;

const WORDS: Record<State, string> = {
	abandoned: "abandoned",
	active: "active",
	blocked: "blocked",
	done: "landed",
	held: "held",
	landing: "landing",
	parked: "parked",
	ready: "ready",
};

export const PieceState = (props: { readonly state: State }) => <StatusBadge state={WORDS[props.state]} />;
