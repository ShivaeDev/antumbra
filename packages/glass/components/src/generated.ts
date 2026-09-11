import * as Form from "@antumbra/glass-form/form.ts";
import { Effect, Layer } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import { type Editable, type Held, schemaOf } from "#fields.ts";

const runtime = Atom.runtime(Layer.empty);

export type Sending = (input: Held) => Effect.Effect<number, unknown>;

export function sending(send: (input: never) => Effect.Effect<number, unknown>): Sending;
export function sending(send: unknown): unknown {
	return send;
}

interface Spot {
	readonly field: string;
	readonly message: string;
}

function spotted(failure: unknown): Spot | undefined;
function spotted(failure: unknown): unknown {
	if (typeof failure !== "object" || failure === null || !("field" in failure) || !("message" in failure)) {
		return undefined;
	}
	const { field, message } = failure;
	return typeof field === "string" && typeof message === "string" ? { field, message } : undefined;
}

export const generate = (editables: readonly Editable[], identity: Held, values: Held, send: Sending) =>
	Form.make(schemaOf(editables), {
		initialValues: values,
		onSubmit: (chosen, submitter) =>
			Effect.catch(send({ ...identity, ...chosen }), (failure) => {
				const spot = spotted(failure);
				return spot === undefined ? Effect.fail(failure) : submitter.fail(spot.field, spot.message);
			}),
		runtime,
	});

export type Generated = ReturnType<typeof generate>;
