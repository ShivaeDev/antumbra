import type { HostCapabilityView, QuayView } from "@antumbra/contract";
import type { QuayReading } from "#quay/view.ts";
import { changeSeen } from "#voyage-projection.ts";

export const quaySeen = (reading: QuayReading, hosts: ReadonlyArray<HostCapabilityView>): QuayView => ({
	hosts,
	pieces: reading.pieces,
	rows: reading.rows.map((row) => ({
		...row,
		change: changeSeen(row.change),
	})),
});
