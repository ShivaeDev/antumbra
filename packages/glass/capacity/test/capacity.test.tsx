import { eventually } from "@antumbra/app-testing/answers.ts";
import { press, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "vitest";
import { ProviderCapacities } from "#capacity.tsx";

it.glass("retries a blocked provider and refreshes its card", function* ({ api, render }) {
	yield* api.backends.listModels({ backend: "codex", models: [], failure: null });
	yield* api.capacity.observe({
		backend: "codex",
		status: "blocked",
		reason: "usage-limit",
		detail: "Quota reached",
		observedAt: 0,
		resetsAt: null,
		utilization: 1,
	});
	const container = yield* render(<ProviderCapacities api={api} />);
	yield* until(() => container.textContent?.includes("Provider paused") === true, "the provider pause to appear");
	expect(container.textContent).toContain("Quota reached");
	expect(container.textContent).toContain("100% used");
	yield* press(container, "Retry provider");
	yield* eventually(api.capacity.providers({}), (rows) => rows.some((row) => row.backend === "codex" && row.status === "available"));
	yield* until(() => !container.textContent?.includes("Provider paused"), "the released provider card to disappear");
});
