import type { Ruling, RulingAnswer } from "#model.ts";

export type RulingHeldEnd =
	| { readonly _tag: "asked"; readonly note: string; readonly ruling: Ruling }
	| { readonly _tag: "parked"; readonly note: string; readonly ruling: Ruling }
	| { readonly _tag: "ruled"; readonly answer: RulingAnswer; readonly ruling: Ruling };
