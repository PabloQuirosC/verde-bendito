import { createFileRoute } from "@tanstack/react-router";
import ComandaDetailPage from "./operaciones/-ComandaDetailPage";

export const Route = createFileRoute("/_app/comandas/$ordenId")({
  component: ComandaDetailPage,
});
