import { connect } from "@antumbra/glass-client/connect.ts";
import { GlassContext, Surface } from "@antumbra/renderer";
import { features } from "@antumbra/server/features.ts";
import { Effect } from "effect";
import { createRoot } from "react-dom/client";
import "@antumbra/renderer/stylesheet.css";

const glass = connect(
	features,
	Effect.promise(() => window.antumbra.server()),
);
const container = document.getElementById("root");
if (container !== null) {
	createRoot(container).render(
		<glass.Provider>
			<GlassContext value={glass.api}>
				<Surface />
			</GlassContext>
		</glass.Provider>,
	);
}
