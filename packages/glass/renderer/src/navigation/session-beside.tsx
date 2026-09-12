import { cn } from "@antumbra/glass-components/class-names.ts";
import { type PointerEvent, type ReactNode, useState } from "react";
import { rememberedPaneWidth, rememberPaneWidth } from "#adapters/pane-width.ts";

const OPENS_AT = 608;
const NARROWEST = 320;
const WIDEST = 1120;
const STEPS: Record<string, number> = { ArrowLeft: 16, ArrowRight: -16 };

const between = (width: number): number => Math.min(WIDEST, Math.max(NARROWEST, width));

export const SessionBeside = (props: { readonly children: ReactNode; readonly session: ReactNode }) => {
	const [width, setWidth] = useState(() => rememberedPaneWidth() ?? OPENS_AT);
	const [grabbed, setGrabbed] = useState<{ readonly from: number; readonly width: number } | null>(null);
	const keep = (next: number) => {
		setWidth(next);
		rememberPaneWidth(next);
	};
	const drag = (event: PointerEvent<HTMLHRElement>) => {
		if (grabbed === null) return;
		setWidth(between(grabbed.width + grabbed.from - event.clientX));
	};
	return (
		<div className={cn("flex min-h-0 min-w-0 flex-1", grabbed === null ? undefined : "cursor-col-resize select-none")}>
			<div className="flex min-h-0 min-w-0 flex-1">{props.children}</div>
			{props.session === null ? null : (
				<>
					<hr
						aria-label="Resize the session"
						aria-orientation="vertical"
						aria-valuenow={width}
						className="relative z-10 my-0 w-px shrink-0 cursor-col-resize border-none bg-border transition-colors after:absolute after:inset-y-0 after:-left-1 after:w-2 after:content-[''] hover:bg-ring data-dragging:bg-ring focus-visible:bg-ring focus-visible:outline-none"
						data-dragging={grabbed === null ? undefined : ""}
						onKeyDown={(event) => {
							const step = STEPS[event.key];
							if (step === undefined) return;
							event.preventDefault();
							keep(between(width + step));
						}}
						onPointerDown={(event) => {
							setGrabbed({ from: event.clientX, width });
							event.currentTarget.setPointerCapture(event.pointerId);
						}}
						onPointerMove={drag}
						onPointerUp={(event) => {
							setGrabbed(null);
							event.currentTarget.releasePointerCapture(event.pointerId);
							keep(width);
						}}
						tabIndex={0}
					/>
					<div className="flex min-h-0 max-w-[60%] shrink-0 flex-col" style={{ width }}>
						{props.session}
					</div>
				</>
			)}
		</div>
	);
};
