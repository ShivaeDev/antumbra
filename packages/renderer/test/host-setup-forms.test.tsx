import type { RepoRegistration, SpawnRequest } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect } from "effect";
import { beforeEach, vi } from "vitest";
import { RendererRequestError } from "#adapters/request-error.ts";
import { mount, settle, write } from "#test/dom.ts";
import { ReposList } from "#views/repos.tsx";
import { SpawnDialog } from "#views/spawn-dialog.tsx";

const { registerRepo, spawnAgent } = vi.hoisted(() => ({ registerRepo: vi.fn(), spawnAgent: vi.fn() }));
vi.mock("#adapters/trpc.ts", () => ({ registerRepo, spawnAgent }));
beforeEach(() => {
	registerRepo.mockReset();
	spawnAgent.mockReset();
});

const input = (label: string): HTMLInputElement | HTMLTextAreaElement => {
	const id = [...document.querySelectorAll("label")].find((element) => element.textContent === label)?.htmlFor;
	const element = id === undefined ? null : document.getElementById(id);
	if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return Effect.runSync(Effect.die(`Missing field ${label}`));
	return element;
};
const change = (label: string, value: string) => {
	write(input(label), value);
};
const button = (label: string): HTMLButtonElement => {
	const element = [...document.querySelectorAll("button")].find((entry) => entry.textContent === label);
	if (element === undefined) return Effect.runSync(Effect.die(`Missing button ${label}`));
	return element;
};
const pick = (label: string) =>
	Effect.gen(function* () {
		yield* settle(() =>
			document.querySelector<HTMLElement>('[role="combobox"]')?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })),
		);
		yield* settle(() =>
			[...document.querySelectorAll<HTMLElement>('[role="option"]')]
				.find((option) => option.textContent === label)
				?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
		);
	});

it.effect("keeps the spawn draft through cancel and failure, then clears only role and charter on success", () =>
	Effect.gen(function* () {
		const started = yield* Deferred.make<SpawnRequest>();
		const first = yield* Deferred.make<void, RendererRequestError>();
		const retried = yield* Deferred.make<void>();
		const second = yield* Deferred.make<void>();
		spawnAgent.mockImplementationOnce((value: SpawnRequest) => Deferred.succeed(started, value).pipe(Effect.andThen(Deferred.await(first))));
		spawnAgent.mockReturnValueOnce(Deferred.succeed(retried, undefined).pipe(Effect.andThen(Deferred.await(second))));
		const { root } = yield* mount();
		yield* settle(() => root.render(<SpawnDialog backends={["codex", "pi"]} />));
		yield* settle(() => button("Spawn agent").click());
		yield* settle(() => document.querySelector("form")?.requestSubmit());
		expect(spawnAgent).not.toHaveBeenCalled();
		expect(input("Role").getAttribute("aria-invalid")).toBe("true");
		yield* pick("pi");
		yield* settle(() => {
			change("Role", " navigator ");
			change("Charter", " chart the shoal ");
		});
		yield* settle(() => button("Cancel").click());
		expect(spawnAgent).not.toHaveBeenCalled();
		yield* settle(() => button("Spawn agent").click());
		expect(input("Role").value).toBe(" navigator ");
		expect(document.querySelector('[role="combobox"]')?.textContent).toBe("pi");
		yield* settle(() => document.querySelector("form")?.requestSubmit());
		expect(yield* Deferred.await(started)).toEqual({ backend: "pi", role: " navigator ", charter: " chart the shoal " });
		expect(button("Spawning…").disabled).toBe(true);
		expect(input("Role").closest("fieldset")?.disabled).toBe(true);
		yield* settle(() => {
			Effect.runSync(Deferred.fail(first, new RendererRequestError({ message: "Backend unavailable" })));
		});
		expect(document.querySelector('[role="alert"]')?.textContent).toContain("Backend unavailable");
		expect(input("Charter").value).toBe(" chart the shoal ");
		yield* settle(() => button("Spawn").click());
		yield* Deferred.await(retried);
		yield* settle(() => {
			Effect.runSync(Deferred.succeed(second, undefined));
		});
		expect(document.querySelector("form")).toBeNull();
		yield* settle(() => button("Spawn agent").click());
		expect(input("Role").value).toBe("");
		expect(input("Charter").value).toBe("");
		expect(document.querySelector('[role="combobox"]')?.textContent).toBe("pi");
	}),
);

it.effect("uses the visible fallback without forgetting the selected backend when availability changes", () =>
	Effect.gen(function* () {
		spawnAgent.mockReturnValue(Effect.fail(new RendererRequestError({ message: "Try again" })));
		const { root } = yield* mount();
		yield* settle(() => root.render(<SpawnDialog backends={[]} />));
		yield* settle(() => button("Spawn agent").click());
		yield* settle(() => {
			change("Role", "navigator");
			change("Charter", "chart the shoal");
		});
		yield* settle(() => document.querySelector("form")?.requestSubmit());
		expect(spawnAgent).not.toHaveBeenCalled();
		yield* settle(() => root.render(<SpawnDialog backends={["codex", "pi"]} />));
		expect(document.querySelector('[role="combobox"]')?.textContent).toBe("codex");
		expect(button("Spawn").disabled).toBe(false);
		yield* pick("pi");
		yield* settle(() => root.render(<SpawnDialog backends={["codex"]} />));
		expect(document.querySelector('[role="combobox"]')?.textContent).toBe("codex");
		yield* settle(() => button("Spawn").click());
		expect(spawnAgent).toHaveBeenCalledWith({ backend: "codex", role: "navigator", charter: "chart the shoal" });
		yield* settle(() => root.render(<SpawnDialog backends={["codex", "pi"]} />));
		expect(document.querySelector('[role="combobox"]')?.textContent).toBe("pi");
		yield* settle(() => button("Spawn").click());
		expect(spawnAgent).toHaveBeenLastCalledWith({ backend: "pi", role: "navigator", charter: "chart the shoal" });
	}),
);

it.effect("retains a failed repository registration and keeps its default ref after success", () =>
	Effect.gen(function* () {
		const started = yield* Deferred.make<RepoRegistration>();
		const first = yield* Deferred.make<void, RendererRequestError>();
		const retried = yield* Deferred.make<void>();
		const second = yield* Deferred.make<void>();
		registerRepo.mockImplementationOnce((value: RepoRegistration) => Deferred.succeed(started, value).pipe(Effect.andThen(Deferred.await(first))));
		registerRepo.mockReturnValueOnce(Deferred.succeed(retried, undefined).pipe(Effect.andThen(Deferred.await(second))));
		const { root } = yield* mount();
		yield* settle(() => root.render(<ReposList repos={[]} onError={() => undefined} />));
		expect(input("Default ref").value).toBe("main");
		yield* settle(() => document.querySelector("form")?.requestSubmit());
		expect(registerRepo).not.toHaveBeenCalled();
		yield* settle(() => {
			change("Source", "/repos/shoals");
			change("Default ref", "trunk");
		});
		yield* settle(() => document.querySelector("form")?.requestSubmit());
		expect(yield* Deferred.await(started)).toEqual({ source: "/repos/shoals", defaultRef: "trunk" });
		expect(button("Adding…").disabled).toBe(true);
		expect(input("Source").closest("fieldset")?.disabled).toBe(true);
		yield* settle(() => {
			Effect.runSync(Deferred.fail(first, new RendererRequestError({ message: "Repository unavailable" })));
		});
		expect(document.querySelector('[role="alert"]')?.textContent).toContain("Repository unavailable");
		expect(input("Source").value).toBe("/repos/shoals");
		yield* settle(() => button("Add").click());
		yield* Deferred.await(retried);
		yield* settle(() => {
			Effect.runSync(Deferred.succeed(second, undefined));
		});
		expect(input("Source").value).toBe("");
		expect(input("Default ref").value).toBe("trunk");
		expect(document.querySelector('[role="alert"]')).toBeNull();
	}),
);
