import { createFileRoute } from "@tanstack/react-router";
import ProductosPage from "./operaciones/-ProductosPage";

export const Route = createFileRoute("/_app/productos")({
  component: ProductosPage,
});
