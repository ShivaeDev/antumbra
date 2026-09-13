import type { smoothingState } from "@antumbra/domain-boards/queries/smoothing-state.ts";
import { Button } from "@antumbra/glass-components/shadcn/button.tsx";

type BoardSmoothing = typeof smoothingState.output.Type;

const SMOOTH_NOW = "Write one summary that stands in for the new entries";

const NOTHING_TO_SMOOTH = "Nothing new to smooth";

const waiting = (uncovered: number): string => `Smoothing ${uncovered} ${uncovered === 1 ? "entry" : "entries"}`;

export const SmoothNow = ({ onSmooth, smoothing }: { readonly onSmooth: () => void; readonly smoothing: BoardSmoothing }) => (
	<Button
		disabled={smoothing.uncovered === 0 || smoothing.state === "running"}
		onClick={onSmooth}
		size="sm"
		title={smoothing.uncovered === 0 ? NOTHING_TO_SMOOTH : SMOOTH_NOW}
		type="button"
		variant="ghost"
	>
		Smooth now
	</Button>
);

export const SmoothingLine = ({ onSmooth, smoothing }: { readonly onSmooth: () => void; readonly smoothing: BoardSmoothing }) => {
	if (smoothing.state === "running") {
		return <p className="text-xs text-muted-foreground">{waiting(smoothing.uncovered)}</p>;
	}
	if (smoothing.state === "idle") {
		return null;
	}
	return (
		<p className="flex min-w-0 items-center gap-1.5 text-xs text-state-failed">
			Smoothing failed
			<Button className="h-auto p-0 text-xs" onClick={onSmooth} type="button" variant="link">
				Try again
			</Button>
		</p>
	);
};
