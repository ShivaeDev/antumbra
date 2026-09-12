import { useCallback, useEffect, useRef, useState } from "react";

const NEAR_TAIL = 64;

interface Tail {
	readonly atTail: boolean;
	readonly onScroll: () => void;
	readonly pane: React.RefObject<HTMLDivElement | null>;
	readonly toTail: () => void;
}

export const useTail = (count: number): Tail => {
	const pane = useRef<HTMLDivElement>(null);
	const [atTail, setAtTail] = useState(true);

	const toTail = useCallback(() => {
		const node = pane.current;
		if (node !== null) {
			node.scrollTop = node.scrollHeight;
		}
		setAtTail(true);
	}, []);

	useEffect(() => {
		const node = pane.current;
		if (atTail && node !== null) {
			node.scrollTop = node.scrollHeight;
		}
	}, [atTail, count]);

	const onScroll = useCallback(() => {
		const node = pane.current;
		if (node !== null) {
			const behind = node.scrollHeight - node.scrollTop - node.clientHeight;
			setAtTail(behind <= NEAR_TAIL);
		}
	}, []);

	return { atTail, onScroll, pane, toTail };
};
