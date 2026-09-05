import { useAtomSet } from "@effect/atom-react";
import type { Effect } from "effect";
import { Atom } from "effect/unstable/reactivity";
import { useState } from "react";

export const useRequest = <A, E>() => {
	const [requestAtom] = useState(() => Atom.fn((effect: Effect.Effect<A, E>) => effect));
	const submit = useAtomSet(requestAtom, { mode: "promiseExit" });
	return { requestAtom, submit };
};
