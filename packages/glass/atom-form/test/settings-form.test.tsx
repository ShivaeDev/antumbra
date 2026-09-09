import { RegistryProvider } from "@effect/atom-react";
import { expect, it } from "@effect/vitest";
import { Context, Data, Effect, Layer, Schema } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import { beforeEach } from "vitest";
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

const SlugRegistryLive = Layer.succeed(SlugRegistry)({
	isTaken: (slug) =>
		Effect.sync(() => {
			checked.push(slug);
			return taken.has(slug);
		}).pipe(Effect.delay("5 millis")),
	save: (settings) => (taken.has(settings.slug) ? Effect.fail(new SlugTaken({ slug: settings.slug })) : Effect.succeed(settings)),
});

const runtime = Atom.runtime(SlugRegistryLive);

const makeForm = (submitted: Settings[]) =>
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
		runtime,
	});

type SettingsForm = ReturnType<typeof makeForm>;

const Text = (props: { readonly form: SettingsForm; readonly name: "name" | "retries" | "slug"; readonly renders: Record<string, number> }) => {
	const field = useField(props.form, props.name);
	props.renders[props.name] = (props.renders[props.name] ?? 0) + 1;
	return (
		<label>
			{props.name}
			<input aria-label={props.name} onBlur={field.onBlur} onChange={(event) => field.onChange(event.target.value)} value={field.value} />
			<span data-testid={`${props.name}-error`}>{field.error ?? ""}</span>
		</label>
	);
};

const Choice = (props: { readonly form: SettingsForm; readonly renders: Record<string, number> }) => {
	const field = useField(props.form, "backend");
	props.renders.backend = (props.renders.backend ?? 0) + 1;
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

const shown = (form: SettingsForm, renders: Record<string, number> = {}) =>
	Effect.gen(function* () {
		const { container, root } = yield* mount();
		yield* settle(() =>
			root.render(
				<RegistryProvider>
					<Text form={form} name="name" renders={renders} />
					<Text form={form} name="retries" renders={renders} />
					<Text form={form} name="slug" renders={renders} />
					<Choice form={form} renders={renders} />
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

const until = (ready: () => boolean): Effect.Effect<void> =>
	Effect.gen(function* () {
		for (let attempt = 0; attempt < 200; attempt += 1) {
			yield* settle(() => undefined);
			if (ready()) {
				return;
			}
			yield* Effect.sleep("5 millis");
		}
		return yield* Effect.die("the form never settled");
	});

beforeEach(() => {
	checked.length = 0;
});

it.live("shows a field error for an invalid number", () =>
	Effect.gen(function* () {
		const container = yield* shown(makeForm([]));
		yield* typing(container, "retries", "abc");
		yield* until(() => said(container, "retries") !== "");
		expect(said(container, "name")).toBe("");
	}),
);

it.live("derives select options from the schema", () =>
	Effect.gen(function* () {
		const container = yield* shown(makeForm([]));
		expect([...container.querySelectorAll("option")].map((option) => option.textContent)).toEqual(["local", "remote", "hybrid"]);
	}),
);

it.live("reports a taken slug through the async check", () =>
	Effect.gen(function* () {
		const container = yield* shown(makeForm([]));
		yield* typing(container, "slug", "admin");
		expect(said(container, "slug")).toBe("");
		yield* until(() => said(container, "slug") === "That slug is taken");
	}),
);

it.live("skips the async check while the field fails schema validation", () =>
	Effect.gen(function* () {
		const container = yield* shown(makeForm([]));
		yield* typing(container, "slug", "ab");
		yield* until(() => said(container, "slug") !== "");
		expect(checked).toEqual([]);
	}),
);

it.live("coalesces keystrokes into one check once the field is live", () =>
	Effect.gen(function* () {
		const container = yield* shown(makeForm([]));
		yield* typing(container, "slug", "free");
		yield* until(() => checked.length === 1);
		checked.length = 0;
		yield* typing(container, "slug", "adm");
		yield* typing(container, "slug", "admi");
		yield* typing(container, "slug", "admin");
		yield* until(() => said(container, "slug") === "That slug is taken");
		expect(checked).toEqual(["admin"]);
	}),
);

it.live("clears the async check message once the slug is free", () =>
	Effect.gen(function* () {
		const container = yield* shown(makeForm([]));
		yield* typing(container, "slug", "admin");
		yield* until(() => said(container, "slug") === "That slug is taken");
		yield* typing(container, "slug", "staging");
		yield* until(() => said(container, "slug") === "");
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
		yield* until(() => submitted.length === 1);
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
		yield* until(() => said(container, "slug") === `"root" is already in use`);
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

it.live("re-renders only the field that changed", () =>
	Effect.gen(function* () {
		const renders: Record<string, number> = {};
		const container = yield* shown(makeForm([]), renders);
		yield* until(() => said(container, "name") === "");
		const before = { ...renders };
		yield* typing(container, "name", "Ops");
		yield* until(() => (renders.name ?? 0) > (before.name ?? 0));
		yield* Effect.sleep("50 millis");
		yield* settle(() => undefined);
		expect(renders.retries).toBe(before.retries);
		expect(renders.slug).toBe(before.slug);
		expect(renders.backend).toBe(before.backend);
	}),
);
