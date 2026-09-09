import { Effect, Equal, Option, Result, type Schema, SchemaParser } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";
import * as AtomRef from "effect/unstable/reactivity/AtomRef";
import { type FieldMessages, literalChoices, messagesByField, noMessages, withoutField } from "#messages.ts";
import {
	type Config,
	checkOf,
	choicesOf,
	type Decoded,
	type Encoded,
	FieldFailure,
	type Fields,
	type Form,
	fieldOf,
	holder,
	Invalid,
	type Name,
	type Submitter,
} from "#shape.ts";

interface Status {
	readonly failures: FieldMessages;
	readonly submitted: boolean;
	readonly touched: Readonly<Record<string, true>>;
}

const fromRef = <A>(ref: AtomRef.ReadonlyRef<A>): Atom.Atom<A> =>
	Atom.readable((get) => {
		get.addFinalizer(ref.subscribe((value) => get.setSelf(value)));
		return ref.value;
	});

export const make = <F extends Fields, A, E, R, ER>(schema: Schema.Struct<F>, config: Config<F, A, E, R, ER>): Form<F, A, E, ER> => {
	const { initialValues, onSubmit, runtime } = config;
	const debounce = config.debounce ?? "300 millis";
	const checks: ReadonlyMap<string, unknown> = new Map(Object.entries(config.checks ?? {}));
	const decode = SchemaParser.decodeUnknownEffect(schema, { errors: "all" });

	const values = AtomRef.make(initialValues);
	const status = AtomRef.make<Status>({ failures: noMessages, submitted: false, touched: {} });
	const held = new Map<string, AtomRef.AtomRef<unknown>>();
	const refFor = (name: string): AtomRef.AtomRef<unknown> => {
		const known = held.get(name);
		if (known !== undefined) {
			return known;
		}
		const made = holder(values).prop(name);
		held.set(name, made);
		return made;
	};

	const offered: Record<string, readonly unknown[]> = {};
	for (const [name, member] of Object.entries(schema.fields)) {
		const choices = literalChoices(member.ast);
		if (choices !== undefined) {
			offered[name] = choices;
		}
	}

	const valuesAtom = fromRef(values);
	const touchedAtom = fromRef(status.prop("touched"));
	const submittedAtom = fromRef(status.prop("submitted"));
	const failuresAtom = fromRef(status.prop("failures"));

	const decoded = runtime.atom((get) =>
		decode(get(valuesAtom)).pipe(
			Effect.match({
				onFailure: (issue): Result.Result<Decoded<F>, FieldMessages> => Result.fail(messagesByField(issue)),
				onSuccess: (value): Result.Result<Decoded<F>, FieldMessages> => Result.succeed(value),
			}),
		),
	);

	const schemaMessages = Atom.map(decoded, (result) =>
		Option.match(AsyncResult.value(result), {
			onNone: () => noMessages,
			onSome: (either) => (Result.isFailure(either) ? either.failure : noMessages),
		}),
	);

	const schemaError = Atom.family((name: string) => Atom.map(schemaMessages, (messages) => messages[name]));

	const checkError = Atom.family((name: string): Atom.Atom<string | undefined> => {
		const check = checks.get(name);
		if (check === undefined) {
			return Atom.make((): string | undefined => undefined);
		}
		const settled = Atom.debounce(fromRef(refFor(name)), debounce);
		const answered = runtime.atom((get) => checkOf<R>(check)(get(settled)));
		return Atom.map(answered, (value) => Option.getOrUndefined(AsyncResult.value(value)));
	});

	const error = Atom.family((name: string) =>
		Atom.readable((get): string | undefined => {
			if (get(touchedAtom)[name] !== true && !get(submittedAtom)) {
				return undefined;
			}
			return get(failuresAtom)[name] ?? get(schemaError(name)) ?? get(checkError(name));
		}),
	);

	const touch = (name: string): void => {
		status.update((current) =>
			current.touched[name] === true && !(name in current.failures)
				? current
				: { ...current, failures: withoutField(current.failures, name), touched: { ...current.touched, [name]: true } },
		);
	};

	const noted = (cause: E | FieldFailure): Effect.Effect<void> =>
		Effect.sync(() => {
			if (cause instanceof FieldFailure) {
				status.update((current) => ({ ...current, failures: { ...current.failures, [cause.path]: cause.message } }));
			}
		});

	const submitter: Submitter<Name<F>> = { fail: (path, message) => Effect.fail(new FieldFailure({ message, path })) };

	const submit = runtime.fn<void>()(() =>
		Effect.gen(function* () {
			status.update((current) => ({ ...current, failures: noMessages, submitted: true }));
			const value = yield* decode(values.value).pipe(Effect.mapError((issue) => new Invalid({ messages: messagesByField(issue) })));
			return yield* onSubmit(value, submitter).pipe(Effect.tapError(noted));
		}),
	);

	const dirty = Atom.readable((get) => {
		const current: Readonly<Record<string, unknown>> = get(valuesAtom);
		const initial: Readonly<Record<string, unknown>> = initialValues;
		return Object.keys(initial).some((name) => !Equal.equals(current[name], initial[name]));
	});

	return {
		blur: touch,
		change: (name, value) => {
			refFor(name).set(value);
			touch(name);
		},
		choices: <K extends Name<F>>(name: K) => choicesOf<Encoded<F>[K]>(offered[name]),
		dirty,
		error,
		field: <K extends Name<F>>(name: K) => fieldOf<Encoded<F>[K]>(refFor(name)),
		submit,
		submitting: Atom.map(submit, AsyncResult.isWaiting),
		values,
	};
};
