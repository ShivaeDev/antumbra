import { labelled, settle } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { useState } from "react";
import { Dialog, DialogContent } from "#ui/dialog.tsx";
import { DialogTitle } from "#ui/dialog-sections.tsx";

const Soundings = () => {
	const [open, setOpen] = useState(true);
	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogContent>
				<DialogTitle>Take a sounding</DialogTitle>
				<input aria-label="Depth" />
			</DialogContent>
		</Dialog>
	);
};

const closeButton = (): HTMLButtonElement => {
	const found = [...document.body.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === "Close");
	return found ?? expect.unreachable("the dialog offers a close button");
};

it.glass("closes a dialog without disturbing the field a reader is in", function* ({ render }) {
	yield* render(<Soundings />);
	const depth = labelled<HTMLInputElement>(document.body, "Depth");
	yield* settle(() => depth.focus());
	const close = closeButton();
	const down = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
	yield* settle(() => {
		close.dispatchEvent(down);
		close.click();
	});
	expect(down.defaultPrevented).toBe(true);
	expect(document.querySelector('[role="dialog"]')).toBeNull();
});
