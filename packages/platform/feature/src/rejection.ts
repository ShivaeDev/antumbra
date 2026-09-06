import { type Cause, Data, Effect } from "effect";
import type { Fields, Values } from "#fields.ts";

export class AlreadyDone extends Data.TaggedError("AlreadyDone")<{ readonly requestId: string; readonly seq: number }> {}

export class RowNotFound extends Data.TaggedError("RowNotFound")<{ readonly key: string; readonly row: string }> {}

export type RejectionSpecs = Readonly<Record<string, Fields>>;

export type RejectionValue<Tag extends string, Of extends Fields> = Cause.YieldableError & { readonly _tag: Tag } & Readonly<Values<Of>>;

export type RejectionClass<Tag extends string, Of extends Fields> = new (payload: Values<Of>) => RejectionValue<Tag, Of>;

export type Rejections<Specs extends RejectionSpecs> = {
	readonly [Tag in keyof Specs & string]: RejectionClass<Tag, Specs[Tag]>;
} & { readonly AlreadyDone: typeof AlreadyDone };

export type Reject<Specs extends RejectionSpecs> = {
	readonly [Tag in keyof Specs & string]: (payload: Values<Specs[Tag]>) => Effect.Effect<never, RejectionValue<Tag, Specs[Tag]>>;
};

export type RejectedBy<Specs extends RejectionSpecs> = {
	[Tag in keyof Specs & string]: RejectionValue<Tag, Specs[Tag]>;
}[keyof Specs & string];

export interface RejectionPair<Specs extends RejectionSpecs> {
	readonly reject: Reject<Specs>;
	readonly rejections: Rejections<Specs>;
}

export function rejectionPair<Specs extends RejectionSpecs>(specs: Specs): RejectionPair<Specs>;
export function rejectionPair(specs: RejectionSpecs): { readonly reject: object; readonly rejections: object } {
	const rejections: Record<string, unknown> = { AlreadyDone };
	const reject: Record<string, unknown> = {};
	for (const tag of Object.keys(specs)) {
		const Rejection = Data.TaggedError(tag)<Record<string, unknown>>;
		rejections[tag] = Rejection;
		reject[tag] = (payload: Record<string, unknown>) => Effect.fail(new Rejection(payload));
	}
	return { reject, rejections };
}
