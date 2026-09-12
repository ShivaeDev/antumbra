import { Effect, Fiber, Stream } from "effect";
import { useEffect, useMemo, useState } from "react";
import type { DraftRef, DraftSnapshot, Drafts } from "#drafts.ts";

interface Editing {
	pending: Fiber.Fiber<DraftSnapshot> | undefined;
	latest: DraftSnapshot | undefined;
	editing: number;
	written: number;
}
export const useDraft = (drafts: Drafts, sessionId: string) => {
	const ref = useMemo<DraftRef>(() => ({ sessionId, slot: "message" }), [sessionId]);
	const state = useMemo<Editing>(() => ({ pending: undefined, latest: undefined, editing: 0, written: 0 }), [ref]);
	const [text, setText] = useState("");
	useEffect(() => {
		setText("");
		const fiber = Effect.runFork(
			drafts.watch(ref).pipe(
				Stream.runForEach((snapshot) =>
					Effect.sync(() => {
						state.latest = snapshot;
						if (state.editing === state.written) {
							state.pending = undefined;
							setText(snapshot.text);
						}
					}),
				),
			),
		);
		return () => {
			Effect.runFork(Fiber.interrupt(fiber));
		};
	}, [drafts, ref, state]);
	const change = (value: string) => {
		setText(value);
		const version = ++state.editing;
		const before = state.pending;
		state.pending = Effect.runFork(
			(before === undefined ? Effect.void : Fiber.join(before)).pipe(
				Effect.andThen(drafts.write(ref, value)),
				Effect.tap((snapshot) =>
					Effect.sync(() => {
						state.written = version;
						state.latest = snapshot;
					}),
				),
			),
		);
	};
	const capture = () => {
		if (state.pending !== undefined) return Fiber.join(state.pending);
		return state.latest === undefined ? drafts.write(ref, text) : Effect.succeed(state.latest);
	};
	const clear = (sent: DraftSnapshot) => drafts.clear(ref, sent.revision);
	return { text, change, capture, clear };
};
