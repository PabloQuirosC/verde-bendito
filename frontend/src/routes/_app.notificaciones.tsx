import { createFileRoute } from '@tanstack/react-router'
import Notificaciones from '@/pages/Notificaciones'

export const Route = createFileRoute('/_app/notificaciones')({
  component: Notificaciones,
})
