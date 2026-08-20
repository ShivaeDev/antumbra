import { expect, it } from "@effect/vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PlacedSurface } from "#surface.tsx";
import { SessionRow } from "#views/session-row.tsx";

// why: falling back to the console would hand a window that main could not
// place the powers of the window the app is driven from.
it("shows a refusal, never the console, when a window has no place", () => {
	const markup = renderToStaticMarkup(<PlacedSurface place={undefined} />);
	expect(markup).toContain("this window has no place");
	expect(markup).not.toContain("Antumbra");
	expect(markup).not.toContain("voyages");
});

it("renders a placed window's own subject", () => {
	const markup = renderToStaticMarkup(
		<PlacedSurface place={{ role: "transcript", sessionId: "session-1" }} />,
	);
	expect(markup).toContain("no events yet");
	expect(markup).not.toContain("Antumbra");
});

it("offers a window of its own for a session", () => {
	const markup = renderToStaticMarkup(
		<SessionRow
			onError={() => undefined}
			onSelect={() => undefined}
			selected={undefined}
			session={{
				backend: "scripted",
				canInterrupt: false,
				canSend: false,
				cwd: "/tmp/reef",
				diag: { current: true, execution: "idle", intents: [] },
				id: "session-1",
				status: "open",
			}}
		/>,
	);
	expect(markup).toContain("open in window");
});
