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

// why: an artifact window and a transcript window are both children, so the
// surface must tell them apart by role rather than by "not the console".
it("routes an artifact window to its artifact, never a transcript", () => {
	const markup = renderToStaticMarkup(
		<PlacedSurface place={{ artifactId: "artifact-1", role: "artifact" }} />,
	);
	expect(markup).toContain("reading Artifact");
	expect(markup).not.toContain("no events yet");
	expect(markup).not.toContain("Antumbra");
});

// why: every window loads the one app document and therefore the one
// stylesheet, so a shell that paints its own colours is drifting from the
// console for no reason a reader could see.
it("paints every window from the app's ground, never its own colour", () => {
	const shells = [
		renderToStaticMarkup(<PlacedSurface place={undefined} />),
		renderToStaticMarkup(
			<PlacedSurface place={{ role: "transcript", sessionId: "session-1" }} />,
		),
		renderToStaticMarkup(
			<PlacedSurface place={{ artifactId: "artifact-1", role: "artifact" }} />,
		),
	];

	for (const markup of shells) {
		expect(markup).toContain("bg-background");
		expect(markup).not.toMatch(/#[0-9a-f]{6}/i);
		expect(markup).not.toContain("style=");
	}
});

it("offers a window of its own for a session", () => {
	const markup = renderToStaticMarkup(
		<SessionRow
			onError={() => undefined}
			onSelect={() => undefined}
			selected={undefined}
			session={{
				addressable: [],
				backend: "scripted",
				canAttachImages: false,
				canInterrupt: false,
				canSend: false,
				canSleep: false,
				cwd: "/tmp/reef",
				diag: { current: true, execution: "idle", intents: [] },
				id: "session-1",
				presence: "idle",
				status: "open",
			}}
		/>,
	);
	expect(markup).toContain("Open in a window");
});
