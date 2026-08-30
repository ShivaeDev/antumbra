// why: @vitest-environment happy-dom exercises paste, previews, and retries at
// the real React boundary.

import type { Fleet } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";
import { SessionMessage } from "#views/session-message.tsx";

const { sendSessionInput } = vi.hoisted(() => ({ sendSessionInput: vi.fn() }));
vi.mock("#adapters/trpc.ts", () => ({ sendSessionInput }));

const fleet: Fleet = {
	agents: [
		{
			berths: [],
			canRetire: false,
			charter: "chart the reef",
			diag: { currentSessionId: "session-1", intents: [] },
			id: "agent-1",
			role: "navigator",
			sessions: [
				{
					addressable: [],
					backend: "scripted",
					canAttachImages: true,
					canInterrupt: true,
					canSend: true,
					canSleep: false,
					cwd: "/tmp/reef",
					diag: { current: true, execution: "active", intents: [] },
					id: "session-1",
					presence: "working",
					status: "open",
				},
			],
			status: "alive",
			work: [],
		},
	],
	backends: ["scripted"],
	diag: { intents: [] },
	repos: [],
};

const nativeValue = Object.getOwnPropertyDescriptor(
	HTMLTextAreaElement.prototype,
	"value",
)?.set;

const step = (change: () => void) =>
	Effect.promise(() =>
		act(() => {
			change();
			return Promise.resolve();
		}),
	);

const mounted = () =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* step(() =>
			root.render(
				<SessionMessage
					fleet={fleet}
					onError={() => undefined}
					sessionId="session-1"
				/>,
			),
		);
		return { container, root };
	});

const write = (container: HTMLElement, text: string): void => {
	const input = container.querySelector("textarea");
	if (input === null || nativeValue === undefined) return;
	nativeValue.call(input, text);
	input.dispatchEvent(new Event("input", { bubbles: true }));
};

const pressEnter = (container: HTMLElement): void => {
	container
		.querySelector("textarea")
		?.dispatchEvent(
			new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }),
		);
};

const paste = (container: HTMLElement, files: ReadonlyArray<File>): void => {
	const transfer = new DataTransfer();
	for (const file of files) transfer.items.add(file);
	const event = new Event("paste", { bubbles: true, cancelable: true });
	Object.defineProperty(event, "clipboardData", { value: transfer });
	container.querySelector("textarea")?.dispatchEvent(event);
};

const dropFiles = (
	container: HTMLElement,
	files: ReadonlyArray<File>,
): void => {
	const transfer = new DataTransfer();
	for (const file of files) transfer.items.add(file);
	const event = new Event("drop", { bubbles: true, cancelable: true });
	Object.defineProperty(event, "dataTransfer", { value: transfer });
	container.querySelector("textarea")?.dispatchEvent(event);
};

const pickFiles = (
	container: HTMLElement,
	files: ReadonlyArray<File>,
): void => {
	const picker =
		container.querySelector<HTMLInputElement>('input[type="file"]');
	if (picker === null) return;
	const transfer = new DataTransfer();
	for (const file of files) transfer.items.add(file);
	Object.defineProperty(picker, "files", {
		configurable: true,
		value: transfer.files,
	});
	picker.dispatchEvent(new Event("change", { bubbles: true }));
};

const imageFile = (name: string) =>
	new File([new Uint8Array([1, 2, 3])], name, { type: "image/png" });

const installObjectUrls = () => {
	Object.defineProperty(URL, "createObjectURL", {
		configurable: true,
		value: vi.fn((file: File) => `blob:${file.name}`),
	});
	Object.defineProperty(URL, "revokeObjectURL", {
		configurable: true,
		value: vi.fn(),
	});
};

it.effect(
	"pastes ordered images before text and clears previews only after acceptance",
	() =>
		Effect.gen(function* () {
			installObjectUrls();
			sendSessionInput.mockImplementation(
				(
					_request: unknown,
					onDone: (receipt: { status: "accepted" }) => void,
				) => onDone({ status: "accepted" }),
			);
			const { container, root } = yield* mounted();
			yield* step(() =>
				paste(container, [imageFile("west.png"), imageFile("east.png")]),
			);
			expect(container.querySelectorAll("img")).toHaveLength(2);
			yield* step(() => write(container, "compare these reefs"));
			yield* step(() => pressEnter(container));
			yield* step(() => undefined);
			expect(sendSessionInput).toHaveBeenLastCalledWith(
				expect.objectContaining({
					parts: [
						expect.objectContaining({ name: "west.png", type: "image" }),
						expect.objectContaining({ name: "east.png", type: "image" }),
						{ text: "compare these reefs", type: "text" },
					],
				}),
				expect.any(Function),
				expect.any(Function),
			);
			expect(container.querySelectorAll("img")).toHaveLength(0);
			expect(container.querySelector("textarea")?.value).toBe("");
			yield* step(() => root.unmount());
		}),
);

it.effect("retains the draft and stable id when delivery is refused", () =>
	Effect.gen(function* () {
		installObjectUrls();
		sendSessionInput.mockImplementation(
			(
				_request: unknown,
				_onDone: unknown,
				onError: (message: string) => void,
			) => onError("provider refused"),
		);
		const { container, root } = yield* mounted();
		yield* step(() => paste(container, [imageFile("reef.png")]));
		yield* step(() => pressEnter(container));
		yield* step(() => undefined);
		const firstId = sendSessionInput.mock.calls.at(-1)?.[0].id;
		expect(container.querySelectorAll("img")).toHaveLength(1);
		expect(container.textContent).toContain("provider refused");
		yield* step(() => pressEnter(container));
		yield* step(() => undefined);
		expect(sendSessionInput.mock.calls.at(-1)?.[0].id).toBe(firstId);
		expect(container.querySelectorAll("img")).toHaveLength(1);
		yield* step(() => root.unmount());
	}),
);

it.effect(
	"keeps accepted files visible while truthfully summarising rejects",
	() =>
		Effect.gen(function* () {
			installObjectUrls();
			const { container, root } = yield* mounted();
			const unsupported = new File(["plain text"], "notes.txt", {
				type: "text/plain",
			});
			yield* step(() => paste(container, [unsupported, imageFile("reef.png")]));
			expect(container.querySelectorAll("img")).toHaveLength(1);
			expect(container.textContent).toContain("unsupported_media");
			expect(container.textContent).toContain("1 image attached, 1 rejected");
			yield* step(() => root.unmount());
		}),
);

it.effect(
	"picker and drop append without sending and controls reorder/remove",
	() =>
		Effect.gen(function* () {
			installObjectUrls();
			sendSessionInput.mockClear();
			const { container, root } = yield* mounted();
			yield* step(() => pickFiles(container, [imageFile("west.png")]));
			yield* step(() => dropFiles(container, [imageFile("east.png")]));
			expect(container.querySelectorAll("img")).toHaveLength(2);
			yield* step(() =>
				container
					.querySelector<HTMLButtonElement>(
						'[aria-label="Move east.png earlier"]',
					)
					?.click(),
			);
			expect(container.querySelector("img")?.alt).toBe(
				"Attachment 1: east.png",
			);
			yield* step(() =>
				container
					.querySelector<HTMLButtonElement>('[aria-label="Remove west.png"]')
					?.click(),
			);
			expect(container.querySelectorAll("img")).toHaveLength(1);
			expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:west.png");
			expect(sendSessionInput).not.toHaveBeenCalled();
			yield* step(() => root.unmount());
		}),
);
