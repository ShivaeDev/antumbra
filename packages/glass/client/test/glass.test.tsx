import { answered } from "@antumbra/app-testing/answers.ts";
import { press, until } from "@antumbra/app-testing/glass/dom.ts";
import { type Api, it } from "@antumbra/app-testing/glass/entry.tsx";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { expect } from "@effect/vitest";
import { Cause, Deferred, Effect, Option } from "effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useCommand, useLive } from "#hooks.ts";

type Choose = Api["roleSettings"]["choose"];
type Choice = Parameters<Choose>[0];

const Defaults = (props: { readonly api: Api }) => {
	const rows = useLive(props.api.roleSettings.defaults, {});
	return (
		<span>
			{Option.match(rows.data, {
				onNone: () => "",
				onSome: (settings) => settings.map((setting) => `${setting.role}:${setting.backend ?? "-"}`).join(" "),
			})}
		</span>
	);
};

const Sender = (props: { readonly api: Api; readonly choice: Choice }) => {
	const action = useCommand(props.api.roleSettings.choose);
	return (
		<>
			<button disabled={action.pending} onClick={() => action.run(props.choice)} type="button">
				Choose
			</button>
			<output>{Option.getOrUndefined(AsyncResult.value(action.result))}</output>
		</>
	);
};

it.glass("refreshes a live query after a committed choice", function* ({ api, render }) {
	yield* api.roleSettings.choose({ backend: "claude", effort: null, model: null, role: "flagship", scope: "fleet" });
	const container = yield* render(<Defaults api={api} />);
	yield* until(() => container.textContent?.includes("flagship:claude") === true, "the flagship backend to show claude");
	expect(container.textContent).toContain("crew:-");
	yield* api.roleSettings.choose({ backend: "codex", effort: null, model: null, role: "crew", scope: "fleet" });
	yield* until(() => container.textContent?.includes("crew:codex") === true, "the crew backend to show codex");
	expect(container.textContent).toContain("flagship:claude");
});

it.glass("returns committed sequences from the command hook", function* ({ api, render }) {
	const choice = { backend: "codex", effort: "high", model: "gpt", role: "captain", scope: "fleet" } as const;
	const container = yield* render(<Sender api={api} choice={choice} />);
	yield* press(container, "Choose");
	yield* until(() => Number(container.querySelector("output")?.textContent) > 0, "the first committed sequence to appear");
	const first = Number(container.querySelector("output")?.textContent);
	yield* render(<Sender api={api} choice={{ ...choice, backend: "claude" }} />);
	yield* press(container, "Choose");
	yield* until(() => Number(container.querySelector("output")?.textContent) > first, "the next committed sequence to appear");
	const saved = yield* answered(api.roleSettings.defaults({}), "the role defaults to be read");
	expect(saved.find((row) => row.role === "captain")).toMatchObject({ backend: "claude", model: "gpt", effort: "high" });
});

const Refused = (props: { readonly api: Api }) => {
	const action = useCommand(props.api.voyages.quiet);
	const failure = Option.flatMap(action.cause, Cause.findErrorOption);
	return (
		<>
			<button onClick={() => action.run({ id: VoyageId.make("missing") })} type="button">
				Choose
			</button>
			<output>
				{Option.match(failure, {
					onNone: () => "",
					onSome: (error) => (error._tag === "Unknown" ? `No voyage: ${error.id}` : error._tag),
				})}
			</output>
		</>
	);
};

it.glass("exposes the typed command failure", function* ({ api, render }) {
	const container = yield* render(<Refused api={api} />);
	yield* press(container, "Choose");
	yield* until(() => container.querySelector("output")?.textContent === "No voyage: missing", "the typed domain rejection to appear");
});

const Pending = (props: { readonly command: Choose }) => {
	const action = useCommand(props.command);
	return (
		<button
			disabled={action.pending}
			onClick={() => action.run({ backend: "codex", effort: null, model: null, role: "captain", scope: "fleet" })}
			type="button"
		>
			Choose
		</button>
	);
};

it.glass("interrupts a pending action after unmount", function* ({ api, render }) {
	const started = yield* Deferred.make<void>();
	const released = yield* Deferred.make<void>();
	const command = Object.assign(
		(_input: Choice) =>
			Deferred.succeed(started, undefined).pipe(Effect.andThen(Effect.never), Effect.ensuring(Deferred.succeed(released, undefined))),
		{ command: api.roleSettings.choose.command },
	);
	const container = yield* render(<Pending command={command} />);
	yield* press(container, "Choose");
	yield* Deferred.await(started);
	expect(container.querySelector("button")?.disabled).toBe(true);
	yield* render(null);
	yield* Deferred.await(released).pipe(Effect.timeout("2 seconds"));
});
