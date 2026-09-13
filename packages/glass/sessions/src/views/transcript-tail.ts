import { useCallback, useEffect, useRef, useState } from "react";

const NEAR_TAIL = 64;

interface Tail {
	readonly atTail: boolean;
	readonly root: React.RefObject<HTMLDivElement | null>;
	readonly toTail: () => void;
}

const viewportOf = (root: HTMLDivElement | null): HTMLElement | null =>
	root === null ? null : root.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');

export const useTail = (count: number): Tail => {
	const root = useRef<HTMLDivElement>(null);
	const [atTail, setAtTail] = useState(true);

	const toTail = useCallback(() => {
		const view = viewportOf(root.current);
		if (view !== null) {
			view.scrollTop = view.scrollHeight;
		}
		setAtTail(true);
	}, []);

	useEffect(() => {
		const view = viewportOf(root.current);
		if (view === null) {
			return;
		}
		const onScroll = () => setAtTail(view.scrollHeight - view.scrollTop - view.clientHeight <= NEAR_TAIL);
		view.addEventListener("scroll", onScroll, { passive: true });
		return () => view.removeEventListener("scroll", onScroll);
	}, []);

	useEffect(() => {
		const view = viewportOf(root.current);
		if (atTail && view !== null) {
			view.scrollTop = view.scrollHeight;
		}
	}, [atTail, count]);

	return { atTail, root, toTail };
};
