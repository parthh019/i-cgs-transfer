import { useState, useEffect, useRef } from 'react'
import { eventsAPI } from '../api/endpoints'

export function useEventStatus(eventId, enabled = true) {
  const [status, setStatus] = useState(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!eventId || !enabled) return

    const poll = async () => {
      try {
        const res = await eventsAPI.getStatus(eventId)
        setStatus(res.data)
        if (res.data.status === 'completed' || res.data.status === 'failed') {
          clearInterval(intervalRef.current)
        }
      } catch {
        // silent fail
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 2000)
    return () => clearInterval(intervalRef.current)
  }, [eventId, enabled])

  return status
}
