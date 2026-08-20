import { Buffer } from "node:buffer";
import process from "node:process";
import { type Fleet, SightSource } from "@antumbra/contract";
import { Effect, Stream } from "effect";
import { nativeImage, Tray } from "electron";

const ICON_PIXELS = 32;
const ICON_SCALE = 2;

export interface TrayHandle {
	readonly destroy: () => void;
	readonly onClick: (listener: () => void) => void;
	readonly setTitle: (title: string) => void;
	readonly setToolTip: (tooltip: string) => void;
}

export interface TrayHost {
	readonly create: () => TrayHandle;
}

// why: the fleet publishes capabilities rather than execution state, and the
// roster already reads an interruptible session as one taking a turn. The menu
// bar mirrors that reading instead of inventing a second definition of work.
export const workingAgentCount = (fleet: Fleet): number =>
	fleet.agents.filter((agent) =>
		agent.sessions.some((session) => session.canInterrupt),
	).length;

// why: a quiet menu bar shows the icon alone — a standing "0" spends scarce
// width to say nothing, and the tooltip still names the empty state aloud.
export const trayTitle = (count: number): string =>
	count === 0 ? "" : String(count);

export const trayTooltip = (count: number): string =>
	count === 0
		? "Antumbra — no agent is working"
		: `Antumbra — ${count} ${count === 1 ? "agent" : "agents"} working`;

const showCount = (tray: TrayHandle, fleet: Fleet) =>
	Effect.sync(() => {
		const count = workingAgentCount(fleet);
		tray.setTitle(trayTitle(count));
		tray.setToolTip(trayTooltip(count));
	});

export const runFleetTray = <E>(
	host: TrayHost,
	feed: Stream.Stream<Fleet, E>,
	activate: Effect.Effect<void, unknown>,
) =>
	Effect.gen(function* () {
		const tray = yield* Effect.acquireRelease(
			Effect.sync(() => host.create()),
			(handle) => Effect.sync(() => handle.destroy()),
		);
		yield* Effect.sync(() =>
			tray.onClick(() => {
				activate.pipe(
					Effect.catchCause((cause) =>
						Effect.logError("tray activation failed", cause),
					),
					Effect.runFork,
				);
			}),
		);
		// why: a tray that stopped following the fleet would keep publishing a
		// count that is no longer true, so a feed that ends takes the icon with it.
		yield* Stream.runForEach(feed, (fleet) => showCount(tray, fleet));
	}).pipe(Effect.scoped);

// why: a menu-bar template image is read for its alpha alone — macOS repaints
// it for the current appearance — so the ring is drawn here rather than shipped
// as an opaque asset nobody can review.
const ringBitmap = (size: number): Buffer => {
	const pixels = Buffer.alloc(size * size * 4);
	const centre = (size - 1) / 2;
	const outer = size * 0.42;
	const inner = size * 0.3;
	for (let y = 0; y < size; y += 1) {
		for (let x = 0; x < size; x += 1) {
			const distance = Math.hypot(x - centre, y - centre);
			const coverage = Math.min(outer - distance, distance - inner) + 0.5;
			pixels[(y * size + x) * 4 + 3] = Math.round(
				Math.min(Math.max(coverage, 0), 1) * 255,
			);
		}
	}
	return pixels;
};

const electronTrayHost: TrayHost = {
	create: () => {
		const icon = nativeImage.createFromBitmap(ringBitmap(ICON_PIXELS), {
			height: ICON_PIXELS,
			scaleFactor: ICON_SCALE,
			width: ICON_PIXELS,
		});
		icon.setTemplateImage(true);
		const tray = new Tray(icon);
		return {
			destroy: () => tray.destroy(),
			onClick: (listener) => {
				tray.on("click", listener);
			},
			setTitle: (title) => tray.setTitle(title),
			setToolTip: (tooltip) => tray.setToolTip(tooltip),
		};
	},
};

// why: only macOS carries a title beside a menu-bar icon, so elsewhere the
// count would have nowhere to go and no tray is claimed at all.
export const fleetTray = (activate: Effect.Effect<void, unknown>) =>
	Effect.gen(function* () {
		if (process.platform !== "darwin") {
			return;
		}
		const sight = yield* SightSource;
		yield* runFleetTray(electronTrayHost, sight.fleetFeed, activate);
	});
