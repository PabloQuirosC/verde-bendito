import React, { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://192.168.100.64:8000/api'

export default function PruebaUSB() {
  const [log, setLog] = useState<string[]>([])

  const append = (s: string) => setLog(l => [s, ...l])

  async function testWebUSB() {
    if (!('usb' in navigator)) {
      append('WebUSB no disponible en este navegador')
      return
    }
    try {
      // Request a device - filters empty to allow user selection
      // Note: requires https or localhost
      // @ts-ignore
      const device = await (navigator as any).usb.requestDevice({ filters: [] })
      const vendorId = device.vendorId
      const productId = device.productId
      const serial = device.serialNumber || null
      append(`Seleccionado USB v=${vendorId} p=${productId} s=${serial}`)

      const resp = await fetch(`${API_BASE}/hardware/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'usb', vendorId, productId, serialNumber: serial }),
      })
      const data = await resp.json()
      append(`Backend: ${JSON.stringify(data)}`)
    } catch (e: any) {
      append('Error WebUSB: ' + (e && e.message ? e.message : String(e)))
    }
  }

  async function testWebSerial() {
    if (!('serial' in navigator)) {
      append('WebSerial no disponible en este navegador')
      return
    }
    try {
      // @ts-ignore
      const port = await (navigator as any).serial.requestPort()
      // can't access vendor/product directly via WebSerial; use info hint
      append('Puerto serial seleccionado. Solicitando permiso y leyendo descriptor (si aplica)')

      // send a simple probe to the device if needed; here we just register that it exists
      const resp = await fetch(`${API_BASE}/hardware/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'serial', info: 'serial-port-attached' }),
      })
      const data = await resp.json()
      append(`Backend: ${JSON.stringify(data)}`)
    } catch (e: any) {
      append('Error WebSerial: ' + (e && e.message ? e.message : String(e)))
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-2">Prueba WebUSB / WebSerial (estación POS)</h2>
      <div className="flex gap-2 mb-4">
        <button onClick={testWebUSB} className="btn">Probar WebUSB</button>
        <button onClick={testWebSerial} className="btn">Probar WebSerial</button>
      </div>
      <div className="bg-gray-100 p-2 rounded">
        {log.map((l, i) => (
          <div key={i} className="text-sm">{l}</div>
        ))}
      </div>
    </div>
  )
}
