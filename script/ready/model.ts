import type { Effect } from "effect";

export interface Step {
	readonly args: readonly string[];
	readonly command: string;
	readonly name: string;
}

export interface StepResult {
	readonly exitCode: number;
	readonly output: string;
}

export type Exec = (step: Step) => Effect.Effect<StepResult>;

export interface Report {
	readonly failed: (step: Step, result: StepResult) => Effect.Effect<void>;
	readonly passed: (step: Step, millis: number) => Effect.Effect<void>;
	readonly summary: (passed: number, total: number) => Effect.Effect<void>;
}
