import * as Form from "@antumbra/glass-form/form.ts";
import { Effect, Layer } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import { useLayoutEffect, useRef, useState } from "react";
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

const generate = (editables: readonly Editable[], identity: Held, values: Held, send: Sending, sent: () => void) =>
	Form.make(schemaOf(editables), {
		initialValues: values,
		onSubmit: (chosen, submitter) =>
			Effect.catch(send({ ...identity, ...chosen }), (failure) => {
				const spot = spotted(failure);
				return spot === undefined ? Effect.fail(failure) : submitter.fail(spot.field, spot.message);
			}).pipe(Effect.tap(() => Effect.sync(sent))),
		runtime,
	});

export type Generated = ReturnType<typeof generate>;

export const useGenerated = (editables: readonly Editable[], identity: Held, values: Held, send: Sending, sent: () => void): Generated => {
	const answered = useRef(sent);
	const incoming = JSON.stringify(values);
	const received = useRef(incoming);
	const create = () => ({ send, form: generate(editables, identity, values, send, () => answered.current()) });
	const [held, setHeld] = useState(create);
	if (held.send !== send) {
		setHeld(create());
	}
	useLayoutEffect(() => {
		answered.current = sent;
		if (received.current !== incoming) {
			held.form.receive(values);
			received.current = incoming;
		}
	}, [held.form, incoming, sent, values]);
	return held.form;
};
