import { answered } from "@antumbra/app-testing/answers.ts";
import { press, until } from "@antumbra/app-testing/glass/dom.ts";
import { type Api, it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { Option } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useCommand, useLive } from "#hooks.ts";

type Choose = Api["roleSettings"]["choose"];
type Choice = Parameters<Choose>[0];

const Defaults = (props: { readonly api: Api }) => {
	const rows = useLive(props.api.roleSettings.defaults, {});
	return (
		<span>
			{Option.match(AsyncResult.value(rows), {
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
	const saved = yield* answered(api.roleSettings.defaults({}));
	expect(saved.find((row) => row.role === "captain")).toMatchObject({ backend: "claude", model: "gpt", effort: "high" });
});
