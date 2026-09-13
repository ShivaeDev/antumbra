import * as Atom from "effect/unstable/reactivity/Atom";
import type * as AtomRef from "effect/unstable/reactivity/AtomRef";

export const fromRef = <A>(ref: AtomRef.ReadonlyRef<A>): Atom.Atom<A> =>
	Atom.readable((get) => {
		get.addFinalizer(ref.subscribe((value) => get.setSelf(value)));
		return ref.value;
	});
