import { RegistryProvider } from "@effect/atom-react";
import { expect, it } from "@effect/vitest";
import { Context, Data, Deferred, Effect, Layer, Schema } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import { act } from "react";
import { afterEach, beforeEach, vi } from "vitest";
import * as Form from "#form.ts";
import { useDirty, useField, useSubmit } from "#react.ts";
import { mount, settle, write } from "#test/dom.ts";

const Settings = Schema.Struct({
	backend: Schema.Literals(["local", "remote", "hybrid"]),
	name: Schema.Trim.check(Schema.isNonEmpty()),
	retries: Schema.NumberFromString.check(Schema.isInt(), Schema.isGreaterThan(0)),
	slug: Schema.String.check(Schema.isMinLength(3)).pipe(Schema.brand("Slug")),
});

type Settings = typeof Settings.Type;

class SlugTaken extends Data.TaggedError("SlugTaken")<{ readonly slug: string }> {}

class SlugRegistry extends Context.Service<
	SlugRegistry,
	{
		readonly isTaken: (slug: string) => Effect.Effect<boolean>;
		readonly save: (settings: Settings) => Effect.Effect<Settings, SlugTaken>;
	}
>()("SlugRegistry") {}

const taken = new Set(["admin", "root"]);

const checked: string[] = [];

const makeForm = (submitted: Settings[], check: (slug: string) => Effect.Effect<boolean> = (slug) => Effect.succeed(taken.has(slug))) =>
	Form.make(Settings, {
		checks: {
			slug: (slug) =>
				Effect.gen(function* () {
					const registry = yield* SlugRegistry;
					return (yield* registry.isTaken(slug)) ? "That slug is taken" : undefined;
				}),
		},
		debounce: "20 millis",
		initialValues: { backend: "local", name: "", retries: "1", slug: "" },
		onSubmit: (values, { fail }) =>
			Effect.gen(function* () {
				const registry = yield* SlugRegistry;
				const saved = yield* registry.save(values);
				submitted.push(saved);
				return saved;
			}).pipe(Effect.catchTag("SlugTaken", (error) => fail("slug", `"${error.slug}" is already in use`))),
		runtime: Atom.runtime(
			Layer.succeed(SlugRegistry)({
				isTaken: (slug) =>
					Effect.suspend(() => {
						checked.push(slug);
						return check(slug);
					}),
				save: (settings) => (taken.has(settings.slug) ? Effect.fail(new SlugTaken({ slug: settings.slug })) : Effect.succeed(settings)),
			}),
		),
	});

type SettingsForm = ReturnType<typeof makeForm>;

const Text = (props: { readonly form: SettingsForm; readonly name: "name" | "retries" | "slug" }) => {
	const field = useField(props.form, props.name);
	return (
		<label>
			{props.name}
			<input aria-label={props.name} onBlur={field.onBlur} onChange={(event) => field.onChange(event.target.value)} value={field.value} />
			<span data-testid={`${props.name}-error`}>{field.error ?? ""}</span>
		</label>
	);
};

const Choice = (props: { readonly form: SettingsForm }) => {
	const field = useField(props.form, "backend");
	return (
		<select aria-label="backend" onChange={() => undefined} value={field.value}>
			{field.choices?.map((choice) => (
				<option key={choice} value={choice}>
					{choice}
				</option>
			))}
		</select>
	);
};

const DirtyFlag = (props: { readonly form: SettingsForm }) => <span data-testid="dirty">{useDirty(props.form) ? "dirty" : "clean"}</span>;

const SubmitButton = (props: { readonly form: SettingsForm }) => {
	const submit = useSubmit(props.form);
	return (
		<button disabled={submit.submitting} onClick={submit.run} type="button">
			Save
		</button>
	);
};

const shown = (form: SettingsForm) =>
	Effect.gen(function* () {
		const { container, root } = yield* mount();
		yield* settle(() =>
			root.render(
				<RegistryProvider>
					<Text form={form} name="name" />
					<Text form={form} name="retries" />
					<Text form={form} name="slug" />
					<Choice form={form} />
					<DirtyFlag form={form} />
					<SubmitButton form={form} />
				</RegistryProvider>,
			),
		);
		return container;
	});

const named = (container: HTMLElement, label: string): HTMLInputElement =>
	container.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`) ?? Effect.runSync(Effect.die(`no field labelled ${label}`));

const said = (container: HTMLElement, name: string): string => container.querySelector(`[data-testid="${name}-error"]`)?.textContent ?? "";

const typing = (container: HTMLElement, label: string, value: string) => settle(() => write(named(container, label), value));

const clicking = (container: HTMLElement, words: string) =>
	settle(() => [...container.querySelectorAll("button")].find((button) => button.textContent === words)?.click());

const advance = (millis: number) => Effect.promise(() => act(() => vi.advanceTimersByTimeAsync(millis)));

beforeEach(() => {
	checked.length = 0;
	vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(() => vi.useRealTimers());

it.live("shows a field error for an invalid number", () =>
	Effect.gen(function* () {
		const container = yield* shown(makeForm([]));
		yield* typing(container, "retries", "abc");
		expect(said(container, "retries")).not.toBe("");
		expect(said(container, "name")).toBe("");
	}),
);

it.live("derives select options from the schema", () =>
	Effect.gen(function* () {
		const container = yield* shown(makeForm([]));
		expect([...container.querySelectorAll("option")].map((option) => option.textContent)).toEqual(["local", "remote", "hybrid"]);
	}),
);

it.live("reports a taken slug when the async check completes", () =>
	Effect.gen(function* () {
		const answer = yield* Deferred.make<boolean>();
		const container = yield* shown(makeForm([], () => Deferred.await(answer)));
		yield* typing(container, "slug", "admin");
		expect(checked).toEqual(["admin"]);
		expect(said(container, "slug")).toBe("");
		yield* settle(() => Effect.runSync(Deferred.succeed(answer, true)));
		expect(said(container, "slug")).toBe("That slug is taken");
	}),
);

it.live("skips the async check while the field fails schema validation", () =>
	Effect.gen(function* () {
		const container = yield* shown(makeForm([]));
		yield* typing(container, "slug", "ab");
		expect(said(container, "slug")).not.toBe("");
		expect(checked).toEqual([]);
	}),
);

it.live("checks the latest slug after a full debounce interval", () =>
	Effect.gen(function* () {
		const container = yield* shown(makeForm([]));
		yield* typing(container, "slug", "free");
		expect(checked).toEqual(["free"]);
		yield* typing(container, "slug", "adm");
		yield* advance(10);
		yield* typing(container, "slug", "admin");
		yield* advance(19);
		expect(checked).toEqual(["free"]);
		expect(said(container, "slug")).toBe("");
		yield* advance(1);
		expect(checked).toEqual(["free", "admin"]);
		expect(said(container, "slug")).toBe("That slug is taken");
	}),
);

it.live("clears the async check message once the slug is free", () =>
	Effect.gen(function* () {
		const container = yield* shown(makeForm([]));
		yield* typing(container, "slug", "admin");
		expect(said(container, "slug")).toBe("That slug is taken");
		yield* typing(container, "slug", "staging");
		yield* advance(20);
		expect(said(container, "slug")).toBe("");
	}),
);

it.live("hands decoded values to onSubmit", () =>
	Effect.gen(function* () {
		const submitted: Settings[] = [];
		const container = yield* shown(makeForm(submitted));
		yield* typing(container, "name", "  Deployment  ");
		yield* typing(container, "retries", "12");
		yield* typing(container, "slug", "staging");
		yield* clicking(container, "Save");
		expect(submitted).toHaveLength(1);
		expect(submitted[0]).toEqual({ backend: "local", name: "Deployment", retries: 12, slug: "staging" });
		expect(typeof submitted[0]?.retries).toBe("number");
	}),
);

it.live("puts a tagged submit failure on the field it names", () =>
	Effect.gen(function* () {
		const container = yield* shown(makeForm([]));
		yield* typing(container, "name", "Ops");
		yield* typing(container, "slug", "root");
		yield* clicking(container, "Save");
		expect(said(container, "slug")).toBe(`"root" is already in use`);
		expect(said(container, "name")).toBe("");
	}),
);

it.live("tracks dirty against the initial values", () =>
	Effect.gen(function* () {
		const container = yield* shown(makeForm([]));
		const flag = () => container.querySelector('[data-testid="dirty"]')?.textContent;
		expect(flag()).toBe("clean");
		yield* typing(container, "name", "Ops");
		expect(flag()).toBe("dirty");
		yield* typing(container, "name", "");
		expect(flag()).toBe("clean");
	}),
);
