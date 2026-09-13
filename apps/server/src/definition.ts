import { app } from "@antumbra/server-journal/app.ts";
import { features } from "#features.ts";
import { projections } from "#projections.ts";

export const definition = app(features, projections);
