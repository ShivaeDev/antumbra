import { type PointerEvent, type ReactNode, type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { rememberedPaneWidth, rememberPaneWidth } from "#adapters/pane-width.ts";
import { cn } from "#class-names.ts";

const OPENS_AT = 608;
const NARROWEST = 320;
const WIDEST = 1120;
const LIST_FLOOR = 384;
const DIVIDER = 1;
const ALONE_BELOW = LIST_FLOOR + DIVIDER + NARROWEST;
const UNMEASURED = 0;
const STEPS: Record<string, number> = { ArrowLeft: 16, ArrowRight: -16 };

interface Grab {
	readonly from: number;
	readonly width: number;
	readonly at: number;
}

const widest = (content: number): number => (content === UNMEASURED ? WIDEST : Math.min(WIDEST, content - LIST_FLOOR - DIVIDER));

const between = (width: number, content: number): number => Math.max(NARROWEST, Math.min(widest(content), width));

const dragged = (grab: Grab, clientX: number, content: number): number => between(grab.width + grab.from - clientX, content);

const useContentWidth = (): { readonly content: number; readonly root: RefObject<HTMLDivElement | null> } => {
	const root = useRef<HTMLDivElement>(null);
	const [content, setContent] = useState(UNMEASURED);
	useLayoutEffect(() => {
		const node = root.current;
		if (node === null) {
			return;
		}
		const observer = new ResizeObserver((entries) => {
			const measured = entries.at(-1);
			if (measured !== undefined) {
				setContent(measured.contentRect.width);
			}
		});
		observer.observe(node);
		return () => observer.disconnect();
	}, []);
	return { content, root };
};

const Pane = ({ children, width }: { readonly children: ReactNode; readonly width: number | undefined }) => (
	<div
		className={cn("flex min-h-0 min-w-0 flex-col overflow-hidden", width === undefined ? "flex-1" : "shrink-0")}
		style={width === undefined ? undefined : { width }}
	>
		{children}
	</div>
);

export const TwoPane = (props: { readonly list: ReactNode; readonly pane: ReactNode }) => {
	const { content, root } = useContentWidth();
	const [chosen, setChosen] = useState(() => rememberedPaneWidth() ?? OPENS_AT);
	const [grabbed, setGrabbed] = useState<Grab | null>(null);
	const opened = props.pane !== null && props.pane !== undefined;
	const alone = opened && content !== UNMEASURED && content < ALONE_BELOW;
	const width = between(chosen, content);
	useEffect(() => {
		if (!opened || alone) setGrabbed(null);
	}, [opened, alone]);
	const keep = (next: number) => {
		setChosen(next);
		rememberPaneWidth(next);
	};
	const drag = (event: PointerEvent<HTMLHRElement>) => {
		if (grabbed === null) return;
		setGrabbed({ ...grabbed, at: event.clientX });
		setChosen(dragged(grabbed, event.clientX, content));
	};
	const letGo = (clientX?: number) => {
		if (grabbed === null) return;
		setGrabbed(null);
		keep(dragged(grabbed, clientX ?? grabbed.at, content));
	};
	return (
		<div className={cn("flex min-h-0 min-w-0 flex-1", grabbed === null ? undefined : "cursor-col-resize select-none")} ref={root}>
			{alone ? null : <div className={cn("flex min-h-0 flex-1 overflow-hidden", opened ? "min-w-96" : "min-w-0")}>{props.list}</div>}
			{opened && !alone ? (
				<hr
					aria-label="Resize the session"
					aria-orientation="vertical"
					aria-valuemax={widest(content)}
					aria-valuemin={NARROWEST}
					aria-valuenow={width}
					className="relative z-10 my-0 w-px shrink-0 cursor-col-resize border-none bg-border transition-colors after:absolute after:inset-y-0 after:-left-1 after:w-2 after:content-[''] hover:bg-ring data-dragging:bg-ring focus-visible:bg-ring focus-visible:outline-none"
					data-dragging={grabbed === null ? undefined : ""}
					onKeyDown={(event) => {
						const step = STEPS[event.key];
						if (step === undefined) return;
						event.preventDefault();
						keep(between(width + step, content));
					}}
					onLostPointerCapture={() => letGo()}
					onPointerCancel={() => letGo()}
					onPointerDown={(event) => {
						setGrabbed({ at: event.clientX, from: event.clientX, width });
						event.currentTarget.setPointerCapture(event.pointerId);
					}}
					onPointerMove={drag}
					onPointerUp={(event) => letGo(event.clientX)}
					tabIndex={0}
				/>
			) : null}
			{opened ? <Pane width={alone ? undefined : width}>{props.pane}</Pane> : null}
		</div>
	);
};
