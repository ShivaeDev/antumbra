import { SessionReach } from "@antumbra/sessions";
import { Layer } from "effect";
import { KernelReach } from "#kernel-reach/service.ts";

export const sessionReachLayer = Layer.effect(SessionReach)(KernelReach).pipe(Layer.provideMerge(KernelReach.layer));
