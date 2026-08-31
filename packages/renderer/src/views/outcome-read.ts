import type { CallState } from "#hooks/call.ts";

export interface OutcomeRef {
	readonly id: string;
	readonly title: string;
}

export type OutcomeDetail =
	| {
			readonly _tag: "failed";
			readonly message: string;
			readonly title: string;
	  }
	| {
			readonly _tag: "loaded";
			readonly markdown: string;
			readonly title: string;
	  }
	| { readonly _tag: "loading"; readonly title: string };

interface NamedMarkdown {
	readonly markdown: string;
	readonly title: string;
}

export const detailOf = <A>(state: CallState<A>, asked: string, name: (value: A) => NamedMarkdown): OutcomeDetail | undefined => {
	if (state._tag === "idle") return undefined;
	if (state._tag === "pending") return { _tag: "loading", title: asked };
	if (state._tag === "failed") {
		return { _tag: "failed", message: state.message, title: asked };
	}
	const named = name(state.value);
	return { _tag: "loaded", markdown: named.markdown, title: named.title };
};
