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
