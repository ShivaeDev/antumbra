import type { Drafts } from "@antumbra/glass-inputs/drafts.ts";
import { useDraft } from "@antumbra/glass-inputs/use-draft.ts";
import { Effect, Fiber, Stream } from "effect";
import { useEffect, useState } from "react";
export const useSituationDraft = (drafts: Drafts, sessionId: string, slot: string, initial: string) => {
	const draft = useDraft(drafts, sessionId, slot);
	const [drafting, setDrafting] = useState(true);
	useEffect(() => {
		const ref = { sessionId, slot };
		const fiber = Effect.runFork(
			drafts.watch(ref).pipe(
				Stream.take(1),
				Stream.runForEach((snapshot) => (snapshot.text === "" ? drafts.write(ref, initial) : Effect.void)),
				Effect.tap(() => Effect.sync(() => setDrafting(false))),
			),
		);
		return () => {
			Effect.runFork(Fiber.interrupt(fiber));
		};
	}, [drafts, sessionId, slot, initial]);
	return { ...draft, drafting };
};
