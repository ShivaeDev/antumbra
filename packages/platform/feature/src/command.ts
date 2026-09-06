import { Request } from "@antumbra/vocabulary/id.ts";
import { type Effect, Schema } from "effect";
import type { FactPayload, FactShape } from "#fact.ts";
import type { Fields, Values } from "#fields.ts";
import type { ReadHandles } from "#handles.ts";
import { type Reject, type RejectedBy, type RejectionSpecs, type Rejections, rejectionPair } from "#rejection.ts";
import type { RowShape } from "#row.ts";

const requested = { requestId: Request };

export type CommandInput<Input extends Fields> = Values<Input & typeof requested>;

export interface CommandShape {
	readonly name: string;
	readonly input: Fields;
	readonly Input: Schema.Top;
	readonly reads: readonly RowShape[];
	readonly emits: FactShape;
	readonly rejections: RejectionSpecs;
	readonly Rejection: object;
	readonly reject: object;
	readonly run: (input: never, rows: never, reject: never) => Effect.Effect<unknown, unknown>;
}

export type CommandBody<Input extends Fields, Reads extends readonly RowShape[], Emits extends FactShape, Specs extends RejectionSpecs> = (
	input: CommandInput<Input>,
	rows: ReadHandles<Reads>,
	reject: Reject<Specs>,
) => Effect.Effect<FactPayload<Emits>, RejectedBy<Specs>>;

export interface CommandDefinition<
	Name extends string,
	Input extends Fields,
	Reads extends readonly RowShape[],
	Emits extends FactShape,
	Specs extends RejectionSpecs,
> extends CommandShape {
	readonly name: Name;
	readonly input: Input;
	readonly Input: Schema.Struct<Input & typeof requested>;
	readonly reads: Reads;
	readonly emits: Emits;
	readonly rejections: Specs;
	readonly Rejection: Rejections<Specs>;
	readonly reject: Reject<Specs>;
	readonly run: CommandBody<Input, Reads, Emits, Specs>;
}

interface Declaration<Input extends Fields, Reads extends readonly RowShape[], Emits extends FactShape, Specs extends RejectionSpecs> {
	readonly input: Input;
	readonly reads: Reads;
	readonly emits: Emits;
	readonly rejections: Specs;
	readonly run: CommandBody<Input, Reads, Emits, Specs>;
}

export function command<
	Name extends string,
	const Input extends Fields,
	const Reads extends readonly RowShape[],
	Emits extends FactShape,
	const Specs extends RejectionSpecs,
>(name: Name, declaration: Declaration<Input, Reads, Emits, Specs>): CommandDefinition<Name, Input, Reads, Emits, Specs>;
export function command(name: string, declaration: Declaration<Fields, readonly RowShape[], FactShape, RejectionSpecs>): CommandShape {
	const pair = rejectionPair(declaration.rejections);
	return {
		emits: declaration.emits,
		Input: Schema.Struct({ ...declaration.input, ...requested }),
		input: declaration.input,
		name,
		reads: declaration.reads,
		reject: pair.reject,
		Rejection: pair.rejections,
		rejections: declaration.rejections,
		run: declaration.run,
	};
}
