import type { QuayView } from "@antumbra/contract";
import type { ChangeHostCapabilityView } from "#change-procedures.ts";
import type { QuayReading } from "#quay-view.ts";
import { changeSeen } from "#voyage-projection.ts";

// why: the window is told where every change lies and what the hosts can do,
// in one view — a quay assembled from two reads would show a capability that
// disagrees with the rows beneath it.
export const quaySeen = (
	reading: QuayReading,
	hosts: ReadonlyArray<ChangeHostCapabilityView>,
): QuayView => ({
	hosts: hosts.map((host) => ({
		available: host.available,
		detail: host.detail,
		tag: host.tag,
	})),
	pieces: reading.pieces.map((piece) => ({
		id: piece.id,
		title: piece.title,
		voyageName: piece.voyageName,
	})),
	rows: reading.rows.map((row) => ({
		change: changeSeen(row.change),
		group: row.group,
		originSessionId: row.originSessionId,
		pieceId: row.pieceId,
		pieceTitle: row.pieceTitle,
		voyageId: row.voyageId,
		voyageName: row.voyageName,
	})),
});
