import { connect } from "@antumbra/glass-client/connect.ts";
import { host } from "@antumbra/glass-harness/host.ts";
import { features } from "@antumbra/server/features.ts";
import "@antumbra/glass-components/styles/theme.css";

const container = document.getElementById("root");
if (container !== null) host(container, window.antumbra, connect(features));
