import type { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { Badge } from "@antumbra/glass-components/ui/badge.tsx";

type State = typeof pieceProgress.Row.Type.state;
const LABEL: Record<State, string> = {
	abandoned: "Abandoned",
	active: "Active",
	blocked: "Blocked",
	done: "Landed",
	held: "Held",
	landing: "Landing",
	parked: "Parked",
	ready: "Ready",
};
const TONE = {
	abandoned: "outline",
	active: "success",
	blocked: "warning",
	done: "outline",
	held: "outline",
	landing: "info",
	parked: "secondary",
	ready: "info",
} as const;
export const PieceState = (props: { readonly state: State }) => <Badge variant={TONE[props.state]}>{LABEL[props.state]}</Badge>;
