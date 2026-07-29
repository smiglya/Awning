/**
 * Minimal telemetry bus.
 *
 * The API layer emits; nothing subscribes yet. Stage 3 attaches a real sink so
 * a lost lead shows up in a dashboard instead of only in the visitor's browser.
 * Keeping the emit calls here from stage 1 means that wiring is one subscriber,
 * not a sweep through every call site.
 */

export interface TelemetryEvent {
  name: string
  requestId?: string
  code?: string
  status?: number
  attempt?: number
  detail?: unknown
}

type Sink = (event: TelemetryEvent) => void

const sinks = new Set<Sink>()

/** @returns an unsubscribe function */
export function onTelemetry(sink: Sink): () => void {
  sinks.add(sink)
  return () => sinks.delete(sink)
}

export function emit(event: TelemetryEvent): void {
  for (const sink of sinks) {
    try {
      sink(event)
    } catch {
      // a broken sink must never break the request it is observing
    }
  }
  if (import.meta.env.DEV) {
    console.debug('[telemetry]', event.name, event)
  }
}
