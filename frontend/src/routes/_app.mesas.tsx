import { createFileRoute } from "@tanstack/react-router";
import MesasPage from "./operaciones/-MesasPage";

export const Route = createFileRoute("/_app/mesas")({
  component: MesasPage,
});
