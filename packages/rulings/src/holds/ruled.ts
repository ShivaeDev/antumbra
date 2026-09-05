import type { Ruling, RulingAnswer } from "#model.ts";

export interface RuledRuling {
	readonly answer: RulingAnswer;
	readonly ruling: Ruling;
}
