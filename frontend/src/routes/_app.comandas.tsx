import { createFileRoute } from "@tanstack/react-router";
import ComandasPage from "./operaciones/-ComandasPage";

export const Route = createFileRoute("/_app/comandas")({
  component: ComandasPage,
});
