import { expect, it } from "@effect/vitest";
import { listeningUrl } from "#adapters/listening.ts";
import { openSseBuffer } from "#adapters/sse.ts";

// why: the server announces the port it settled on as a padded line of stdout
// and nowhere else, so a backend that cannot read that line has no address.
it("reads the address out of the line the server announces it on", () => {
	expect(
		listeningUrl("     opencode server listening on http://127.0.0.1:51491\n"),
	).toBe("http://127.0.0.1:51491");
	expect(listeningUrl("all LSPs are disabled")).toBeUndefined();
});

it("holds a frame split across two reads until its newline arrives", () => {
	const buffer = openSseBuffer();
	expect(buffer.take('data: {"payload":{"type":"ses')).toEqual([]);
	expect(buffer.take('sion.idle"}}\n\n')).toEqual([
		{ payload: { type: "session.idle" } },
	]);
});

it("drops an unreadable frame rather than taking the stream down", () => {
	const buffer = openSseBuffer();
	expect(buffer.take('data: not json\ndata: {"ok":true}\n')).toEqual([
		{ ok: true },
	]);
});
