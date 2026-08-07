import { createFileRoute } from "@tanstack/react-router";
import PagosPage from "./operaciones/-PagosPage";

export const Route = createFileRoute("/_app/pagos")({
  component: PagosPage,
});
