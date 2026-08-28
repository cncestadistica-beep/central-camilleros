import React, { StrictMode, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import * as XLSX from 'xlsx'
import './styles.css'

const services = [
  'urgencias adultos',
  'hospitalización 1er piso',
  'urgencias pediatricas',
  'idime',
  'hospitalización 3er piso',
  'hospitalización 5to piso',
  'hospitalización 6to piso',
  'uci adultos',
  'uci neonatal',
  'sala de partos',
  'cirugia',
  'consulta externa',
]

const STORAGE_KEY = 'turno-camilleros-solicitudes'
const STORAGE_KEY_CAMILLEROS = 'turno-camilleros-lista-camilleros'
const REQUESTS_UPDATED_EVENT = 'turno-camilleros-solicitudes-updated'
const requestsChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel(REQUESTS_UPDATED_EVENT)
  : null

const defaultCamilleros = [
  'victor perafán',
  'andrés castro',
  'juan lucas',
  'michi jose',
  'albajadmamad',
  'maria gonzales',
]

const initialForm = {
  patient: '',
  record: '',
  service: '',
  location: '',
  destination: '',
  transport: 'wheelchair',
  oxygen: '',
  observation: '',
  priority: 'media',
}

const demoRequests = []

const formatPatientName = (value) => {
  if (!value) return ''
  return value
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ''))
    .join(' ')
}

const formatLowercase = (value) => {
  if (!value) return ''
  return value.toLowerCase()
}

const generateNextRequestId = (requestsList) => {
  let maxIdNum = 1000
  for (const req of (requestsList || [])) {
    if (req.requestId) {
      const match = String(req.requestId).match(/\d+/)
      if (match) {
        const num = parseInt(match[0], 10)
        if (!isNaN(num) && num > maxIdNum) {
          maxIdNum = num
        }
      }
    }
  }
  return `TR-${maxIdNum + 1}`
}

const generateUniqueRequestId = (requestsList) => {
  const usedIds = new Set((requestsList || []).map((request) => String(request.requestId || '').toUpperCase()))
  let nextId = generateNextRequestId(requestsList)
  while (usedIds.has(nextId.toUpperCase())) {
    const number = Number(nextId.replace(/\D/g, '')) + 1
    nextId = `TR-${number}`
  }
  return nextId
}

const persistRequests = (nextRequests) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRequests))
  window.dispatchEvent(new CustomEvent(REQUESTS_UPDATED_EVENT))
  requestsChannel?.postMessage({ updatedAt: Date.now() })
}

function readRequests() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      return []
    }
    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed) || !parsed.length) {
      return []
    }

    return parsed.map((item, idx) => ({
      ...item,
      id: item.id || `req-${idx}`,
      requestId: item.requestId || `TR-${1001 + idx}`,
      patient: formatPatientName(item.patient || ''),
      record: item.record ? String(item.record) : '',
      location: item.location || '',
      destination: item.destination || '',
      service: item.service || '',
      transport: item.transport || '',
      oxygen: item.oxygen || '',
      observation: item.observation || '',
      mover: item.mover || 'sin asignar',
      centralObservation: item.centralObservation || '',
      status: String(item.status || 'PENDIENTE').toUpperCase(),
      timestamp: item.timestamp || '',
      assignmentTime: item.assignmentTime || null,
      movementTime: item.movementTime || 'pendiente',
    }))
  } catch {
    return []
  }
}

function readCamilleros() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY_CAMILLEROS)
    if (saved !== null) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) return parsed
    }
    return defaultCamilleros
  } catch {
    return defaultCamilleros
  }
}

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const parseCODate = (dateStr) => {
  if (!dateStr || dateStr === 'Pendiente' || dateStr === 'pendiente') return null
  const cleaned = dateStr.replace(/\s+/g, ' ').trim()
  const parts = cleaned.split(/[\s,]+/)
  if (!parts[0]) return null
  const dmy = parts[0].split('/')
  if (dmy.length < 3) return null
  const day = parseInt(dmy[0], 10)
  const month = parseInt(dmy[1], 10) - 1
  const year = parseInt(dmy[2], 10)
  if (parts.length > 1) {
    const timeParts = parts[1].split(':')
    let hours = parseInt(timeParts[0], 10)
    const minutes = parseInt(timeParts[1] || '0', 10)
    const seconds = parseInt(timeParts[2] || '0', 10)
    const ampm = cleaned.toLowerCase()
    if ((ampm.includes('p.') || ampm.includes('pm') || ampm.includes('p. m.')) && hours < 12) {
      hours += 12
    } else if ((ampm.includes('a.') || ampm.includes('am') || ampm.includes('a. m.')) && hours === 12) {
      hours = 0
    }
    return new Date(year, month, day, hours, minutes, seconds)
  }
  return new Date(year, month, day)
}

const calculateDurationMinutes = (startStr, endStr) => {
  const dStart = parseCODate(startStr)
  const dEnd = parseCODate(endStr)
  if (!dStart || !dEnd) return null
  const diffMs = dEnd.getTime() - dStart.getTime()
  if (diffMs < 0) return 0
  return Math.round(diffMs / 60000)
}

const formatDuration = (mins) => {
  if (mins === null || mins === undefined) return '—'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

const TURSO_URL = 'https://camilleros-pancachogod.aws-us-east-1.turso.io/v2/pipeline'
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MTg4NTMzNTgsImlhdCI6MTc4NzMxNzM1OCwiaWQiOiIwMWEwMjQ2Ni1hYTAxLTc2ZjYtYTYxYy1kMzQ0MWQ3NWE3NTkiLCJraWQiOiIyNjZrdmlFLUNOQ2lhSl9sckdRS3M3YzhORTJGVVRKWVAwVTFNRURESVk4IiwicmlkIjoiNjYwY2RmMjAtNzMwNy00OTU1LTkyYWUtM2I4M2Q2NDQ4NjJkIn0.UDHRye68UfBbA7wNccw56M5Gefvc6YLoF2WJKloAJ1cuzMtuubuWdUCy8-klH_XWiOYNosbIOEqStLNknvKkAQ'

async function directTursoExecute(statements) {
  const payload = JSON.stringify({
    requests: statements.map(s => {
      if (typeof s === 'string') return { type: 'execute', stmt: { sql: s } }
      return {
        type: 'execute',
        stmt: {
          sql: s.sql,
          args: (s.args || []).map(val => {
            if (val === null || val === undefined) return { type: 'null' }
            if (typeof val === 'number') return { type: 'integer', value: String(val) }
            return { type: 'text', value: String(val) }
          })
        }
      }
    })
  })

  const res = await fetch(TURSO_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TURSO_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: payload
  })
  if (!res.ok) throw new Error(`Turso HTTP ${res.status}`)
  return await res.json()
}

function parseTursoResult(result) {
  if (!result || !result.cols || !result.rows) return []
  const cols = result.cols.map(c => c.name)
  return result.rows.map(row => {
    const obj = {}
    cols.forEach((col, idx) => {
      obj[col] = row[idx] ? row[idx].value : null
    })
    return obj
  })
}

const fetchApiSync = async () => {
  try {
    const res = await directTursoExecute([
      { sql: 'SELECT * FROM solicitudes_camilleros ORDER BY created_at DESC;' },
      { sql: 'SELECT name FROM camilleros_personal WHERE active = 1 ORDER BY name ASC;' }
    ])
    const requestsResult = res.results[0]?.response?.result
    const camillerosResult = res.results[1]?.response?.result

    const rawRequests = parseTursoResult(requestsResult)
    const rawCamilleros = parseTursoResult(camillerosResult).map(r => r.name)

    const mappedRequests = rawRequests.map((item, idx) => ({
      id: item.id || `req-${idx}`,
      requestId: item.request_id || item.requestId || `TR-${1001 + idx}`,
      patient: formatPatientName(item.patient || ''),
      record: item.record ? String(item.record) : '',
      location: item.location || '',
      destination: item.destination || '',
      service: item.service || '',
      transport: item.transport || '',
      oxygen: item.oxygen || '',
      observation: item.observation || '',
      mover: item.mover || 'sin asignar',
      centralObservation: item.central_observation || item.centralObservation || '',
      status: String(item.status || 'PENDIENTE').toUpperCase(),
      timestamp: item.timestamp || '',
      assignmentTime: item.assignment_time || item.assignmentTime || null,
      movementTime: item.movement_time || item.movementTime || 'pendiente',
      priority: (item.priority || 'media').trim().toLowerCase(),
    }))
    persistRequests(mappedRequests)
    if (Array.isArray(rawCamilleros)) {
      window.localStorage.setItem(STORAGE_KEY_CAMILLEROS, JSON.stringify(rawCamilleros))
    }
    return {
      requests: mappedRequests,
      camilleros: rawCamilleros,
    }
  } catch (err) {
    try {
      const res = await fetch('/api/sync')
      if (res.ok) {
        const json = await res.json()
        if (json && json.success) {
          let mappedRequests = null
          if (Array.isArray(json.requests)) {
            mappedRequests = json.requests.map((item, idx) => ({
              id: item.id || `req-${idx}`,
              requestId: item.request_id || item.requestId || `TR-${1001 + idx}`,
              patient: formatPatientName(item.patient || ''),
              record: item.record ? String(item.record) : '',
              location: item.location || '',
              destination: item.destination || '',
              service: item.service || '',
              transport: item.transport || '',
              oxygen: item.oxygen || '',
              observation: item.observation || '',
              mover: item.mover || 'sin asignar',
              centralObservation: item.central_observation || item.centralObservation || '',
              status: String(item.status || 'PENDIENTE').toUpperCase(),
              timestamp: item.timestamp || '',
              assignmentTime: item.assignment_time || item.assignmentTime || null,
              movementTime: item.movement_time || item.movementTime || 'pendiente',
              priority: (item.priority || 'media').trim().toLowerCase(),
            }))
            persistRequests(mappedRequests)
          }
          if (Array.isArray(json.camilleros)) {
            window.localStorage.setItem(STORAGE_KEY_CAMILLEROS, JSON.stringify(json.camilleros))
          }
          return {
            requests: mappedRequests,
            camilleros: json.camilleros,
          }
        }
      }
    } catch (_) {}
  }
  return null
}

const saveApiRequest = async (request) => {
  try {
    const sql = `
      INSERT OR REPLACE INTO solicitudes_camilleros (
        id, request_id, patient, record, service, location, destination,
        transport, oxygen, observation, status, mover, central_observation,
        timestamp, assignment_time, movement_time, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `
    const args = [
      request.id, request.requestId || request.request_id, request.patient, request.record, request.service,
      request.location, request.destination, request.transport, request.oxygen, request.observation || '',
      request.status || 'PENDIENTE', request.mover || 'sin asignar', request.centralObservation || request.central_observation || '',
      request.timestamp, request.assignmentTime || request.assignment_time || null, request.movementTime || request.movement_time || 'pendiente',
      (request.priority || 'media').trim().toLowerCase()
    ]
    await directTursoExecute([{ sql, args }])
  } catch (err) {
    try {
      await fetch('/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })
    } catch (_) {}
  }
}

const saveApiCamillero = async (name, action = 'POST') => {
  const cleanName = (name || '').toLowerCase().trim()
  if (!cleanName) return
  try {
    if (action === 'DELETE') {
      await directTursoExecute([{
        sql: 'DELETE FROM camilleros_personal WHERE LOWER(TRIM(name)) = ?;',
        args: [cleanName]
      }])
    } else {
      await directTursoExecute([{
        sql: 'INSERT OR REPLACE INTO camilleros_personal (name, active) VALUES (?, 1);',
        args: [cleanName]
      }])
    }
  } catch (err) {
    try {
      await fetch('/api/camilleros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, action }),
      })
    } catch (_) {}
  }
}

function App() {
  const lastCamillerosMutationRef = useRef(0)
  const getPageFromPath = () => {
    const path = window.location.pathname
    if (path === '/camilleros') return 'dashboard'
    if (path === '/indicadores' || path === '/estadisticas') return 'analytics'
    if (path === '/historial') return 'history'
    return 'form'
  }

  const [page, setPage] = useState(getPageFromPath)
  const [requests, setRequests] = useState(readRequests)
  const [camilleros, setCamilleros] = useState(readCamilleros)

  useEffect(() => {
    let mounted = true

    const doSync = async () => {
      const data = await fetchApiSync()
      if (mounted && data) {
        if (data.requests) setRequests(data.requests)
        if (data.camilleros && Date.now() - lastCamillerosMutationRef.current > 4000) {
          setCamilleros(data.camilleros)
        }
      }
    }

    doSync()

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        doSync()
      }
    }, 3500)

    const onPopState = () => {
      setRequests(readRequests())
      setCamilleros(readCamilleros())
      setPage(getPageFromPath())
    }
    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        doSync()
      }
    }
    const onFocus = () => {
      doSync()
    }
    window.addEventListener('popstate', onPopState)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      mounted = false
      clearInterval(interval)
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (!e || e.key === STORAGE_KEY || !e.key) {
        setRequests(readRequests())
      }
      if (!e || e.key === STORAGE_KEY_CAMILLEROS || !e.key) {
        setCamilleros(readCamilleros())
      }
    }
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener(REQUESTS_UPDATED_EVENT, handleStorageChange)
    const handleChannelMessage = () => setRequests(readRequests())
    requestsChannel?.addEventListener('message', handleChannelMessage)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener(REQUESTS_UPDATED_EVENT, handleStorageChange)
      requestsChannel?.removeEventListener('message', handleChannelMessage)
    }
  }, [])

  const handleRefresh = async () => {
    const apiReqs = await fetchApiRequests()
    if (apiReqs) {
      setRequests(apiReqs)
    } else {
      setRequests(readRequests())
    }
    const apiCams = await fetchApiCamilleros()
    if (apiCams) {
      setCamilleros(apiCams)
    } else {
      setCamilleros(readCamilleros())
    }
  }

  const handleUpdateCamilleros = async (nextCamilleros, addedName, removedName) => {
    lastCamillerosMutationRef.current = Date.now()
    setCamilleros(nextCamilleros)
    window.localStorage.setItem(STORAGE_KEY_CAMILLEROS, JSON.stringify(nextCamilleros))
    if (addedName) await saveApiCamillero(addedName, 'POST')
    if (removedName) await saveApiCamillero(removedName, 'DELETE')
  }

  const goTo = (nextPage) => {
    setRequests(readRequests())
    setCamilleros(readCamilleros())
    const path = nextPage === 'dashboard' ? '/camilleros' : nextPage === 'analytics' ? '/estadisticas' : nextPage === 'history' ? '/historial' : '/'
    window.history.pushState({}, '', path)
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = (form) => {
    const now = new Date()
    const currentRequests = readRequests()
    const newRequestId = generateUniqueRequestId(currentRequests)
    const request = {
      id: `${Date.now()}`,
      requestId: newRequestId,
      timestamp: now.toLocaleString('es-CO'),
      assignmentTime: null,
      movementTime: 'pendiente',
      patient: formatPatientName(form.patient ? form.patient.trim() : ''),
      record: form.record ? String(form.record).trim() : '',
      location: (form.location || '').trim().toLowerCase(),
      destination: (form.destination || '').trim().toLowerCase(),
      oxygen: (form.oxygen || '').trim().toLowerCase(),
      transport: form.transport === 'wheelchair' ? 'silla de ruedas' : form.transport === 'bed' ? 'cama' : 'camilla ambulancia',
      observation: (form.observation || '').trim().toLowerCase() || '',
      service: (form.service || '').trim().toLowerCase(),
      status: 'PENDIENTE',
      mover: 'sin asignar',
      centralObservation: '',
      priority: (form.priority || 'media').trim().toLowerCase(),
    }
    const nextRequests = [request, ...currentRequests]
    setRequests(nextRequests)
    persistRequests(nextRequests)
    saveApiRequest(request)
    return request
  }

  const updateRequests = (nextRequests, updatedItem) => {
    setRequests(nextRequests)
    persistRequests(nextRequests)
    if (updatedItem) {
      saveApiRequest(updatedItem)
    } else {
      nextRequests.forEach(req => saveApiRequest(req))
    }
  }

  return (
    <div className={`app-shell ${page === 'form' ? 'form-shell-bg' : page === 'analytics' ? 'analytics-shell-bg' : page === 'history' ? 'history-shell-bg' : 'dashboard-shell-bg'}`}>
      <main className={`page-wrap ${page !== 'form' ? 'dashboard-wrap' : 'compact-form-wrap'}`}>
        {page === 'form' ? (
          <RequestForm onSubmit={handleSubmit} requests={requests} onNavigate={goTo} />
        ) : page === 'dashboard' ? (
          <DashboardPage requests={requests} camilleros={camilleros} onUpdate={updateRequests} onRefresh={handleRefresh} onNavigate={goTo} />
        ) : page === 'history' ? (
          <HistoryPage requests={requests} onRefresh={handleRefresh} onNavigate={goTo} />
        ) : (
          <AnalyticsPage requests={requests} camilleros={camilleros} onUpdateCamilleros={handleUpdateCamilleros} onRefresh={handleRefresh} onNavigate={goTo} />
        )}
      </main>
      <footer className="site-footer">powered by statistics CNC 2026</footer>
    </div>
  )
}

function RequestForm({ onSubmit, requests, onNavigate }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [submittedData, setSubmittedData] = useState(null)

  const update = (key, value) => {
    let formattedValue = value
    if (key === 'patient') {
      formattedValue = formatPatientName(value)
    } else if (key === 'record') {
      formattedValue = value.replace(/\D/g, '')
    } else if (key === 'location' || key === 'destination' || key === 'observation') {
      formattedValue = value.toLowerCase()
    } else if (key !== 'transport') {
      formattedValue = formatLowercase(value)
    }
    setForm((prev) => ({ ...prev, [key]: formattedValue }))
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: null }))
    }
  }

  const validate = () => {
    const nextErrors = {}
    if (!form.patient.trim()) nextErrors.patient = 'Ingresa el nombre del paciente'
    if (!form.record.trim()) nextErrors.record = 'Ingresa el número de registro'
    if (!form.service) nextErrors.service = 'Selecciona el servicio que solicita'
    if (!form.location.trim()) nextErrors.location = 'Indica la ubicación específica'
    if (!form.priority) nextErrors.priority = 'Selecciona la prioridad del traslado'
    if (!form.destination.trim()) nextErrors.destination = 'Indica el destino del traslado'
    if (!form.transport) nextErrors.transport = 'Selecciona el medio de transporte'
    if (!form.oxygen) nextErrors.oxygen = 'Indica si requiere soporte de O2'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const submit = (event) => {
    event.preventDefault()
    if (!validate()) return
    const created = onSubmit(form)
    setSubmittedData(created)
  }

  const handleClear = () => {
    setForm(initialForm)
    setErrors({})
  }

  const handleNewSubmission = () => {
    setSubmittedData(null)
    setForm(initialForm)
    setErrors({})
  }

  if (submittedData) {
    return (
      <section className="confirmation-page" aria-labelledby="confirmation-title">
        <div className="confirmation-card">
          <div className="success-icon" aria-hidden="true">✓</div>
          <h1 id="confirmation-title">Solicitud enviada</h1>
          <p className="confirmation-copy">
            Se ha registrado correctamente la solicitud de traslado del paciente.
          </p>
          <div className="summary-box three-items">
            <div>
              <span>ID de Solicitud</span>
              <strong className="id-highlight">{submittedData.requestId || 'TR-1000'}</strong>
            </div>
            <div>
              <span>Número de Registro</span>
              <strong>{submittedData.record}</strong>
            </div>
            <div>
               <span>Paciente</span>
               <strong>{submittedData.patient}</strong>
            </div>
          </div>
          <button className="submit-button wide-button" type="button" onClick={handleNewSubmission}>
            Enviar otra solicitud
          </button>
          <button className="clear-button wide-button" type="button" onClick={() => onNavigate('dashboard')}>
            Ir a la Central
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="form-page compact-form-page" aria-labelledby="form-title">
      <header className="dashboard-hero-banner form-hero-banner">
        <div className="banner-text">
          <p className="eyebrow">SOLICITUD DE SERVICIO</p>
          <h1 id="form-title">Solicitudes de traslados</h1>
          <p className="dashboard-subtitle">Completa los datos para solicitar el traslado del paciente.</p>
        </div>
        <div className="banner-right">
          <img className="banner-logo" src="/logooo-Photoroom.png" alt="Clínica Nueva de Cali" />
        </div>
      </header>

      <form onSubmit={submit} noValidate className="compact-form-card">
        <div className="required-note-bar">
          <span>*</span> Indica que el campo es obligatorio
        </div>

        <div className="form-sections-grid">
          <div className="form-column-card">
            <div className="section-header-bar">Información del Paciente y Servicio</div>
            <div className="column-fields-body">
              <Field label="Nombre de paciente" required error={errors.patient}>
                <input aria-label="Nombre de paciente" value={form.patient} onChange={(e) => update('patient', e.target.value)} placeholder="ej. Juan Pérez" />
              </Field>
              <Field label="Registro" required error={errors.record}>
                <input aria-label="Registro" value={form.record} onChange={(e) => update('record', e.target.value)} placeholder="ej. 3425873" />
              </Field>
              <Field label="Servicio que solicita traslado" required error={errors.service}>
                <Dropdown value={form.service} options={services} placeholder="elegir servicio" onChange={(value) => update('service', value)} />
              </Field>
              <Field label="Ubicación específica" required error={errors.location}>
                <input aria-label="Ubicación específica" value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="ej. urgencias cubículo 4" />
              </Field>
              <Field label="Prioridad del traslado" required error={errors.priority}>
                <Dropdown value={form.priority} options={['alta', 'media', 'baja']} placeholder="elegir prioridad" onChange={(value) => update('priority', value)} />
              </Field>
            </div>
          </div>

          <div className="form-column-card">
            <div className="section-header-bar">Detalles del Traslado</div>
            <div className="column-fields-body">
              <Field label="Destino" required error={errors.destination}>
                <input aria-label="Destino" value={form.destination} onChange={(e) => update('destination', e.target.value)} placeholder="ej. rayos x / tac" />
              </Field>
              <Field label="Medio de transporte" required error={errors.transport}>
                <div className="radio-list radio-stacked">
                  {[
                    ['silla de ruedas', 'wheelchair'],
                    ['cama', 'bed'],
                    ['camilla ambulancia', 'ambulance'],
                  ].map(([label, value]) => (
                    <label className={`radio-option ${form.transport === value ? 'radio-selected' : ''}`} key={value}>
                      <input type="radio" name="transport" value={value} checked={form.transport === value} onChange={() => update('transport', value)} />
                      <span className="radio-circle" />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Soporte de O2" required error={errors.oxygen}>
                <Dropdown value={form.oxygen} options={['si', 'no']} placeholder="elegir" onChange={(value) => update('oxygen', value)} />
              </Field>
              <Field label="Observaciones">
                <input aria-label="Observaciones" value={form.observation} onChange={(e) => update('observation', e.target.value)} placeholder="observaciones adicionales (opcional)" />
              </Field>
            </div>
          </div>
        </div>

        <div className="compact-actions photo-actions">
          <button className="clear-button" type="button" onClick={handleClear}>Limpiar formulario</button>
          <button className="submit-button photo-submit" type="submit">Enviar solicitud</button>
        </div>
      </form>
    </section>
  )
}

function Field({ label, required, error, children }) {
  return <div className={`field-card ${error ? 'has-error' : ''}`}><label className="field-label">{label} {required && <span className="asterisk">*</span>}</label>{children}{error && <div className="field-error"><span className="error-icon">!</span>{error}</div>}</div>
}

function Dropdown({ value, options, placeholder, onChange }) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)
  useEffect(() => {
    const close = (event) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  return <div className={`dropdown ${open ? 'is-open' : ''}`} ref={dropdownRef}><button type="button" className={`dropdown-trigger ${value ? 'has-value' : ''}`} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}><span>{value || placeholder}</span><span className="chevron" aria-hidden="true" /></button>{open && <div className="dropdown-menu" role="listbox"><button type="button" className="dropdown-option placeholder-option" onClick={() => { onChange(''); setOpen(false) }}>{placeholder}</button>{options.map((option) => <button type="button" role="option" aria-selected={value === option} className={`dropdown-option ${value === option ? 'selected' : ''}`} key={option} onClick={() => { onChange(option); setOpen(false) }}>{option}</button>)}</div>}</div>
}

function DashboardPage({ requests, camilleros, onUpdate, onRefresh, onNavigate }) {
  const [filter, setFilter] = useState('TODAS')
  const [query, setQuery] = useState('')
  const [service, setService] = useState('TODOS')
  const [refreshState, setRefreshState] = useState('idle')
  const [detailRequest, setDetailRequest] = useState(null)
  const [editRequest, setEditRequest] = useState(null)
  const [editError, setEditError] = useState('')
  const [editDraft, setEditDraft] = useState({ status: 'PENDIENTE', mover: '', centralObservation: '' })

  useEffect(() => {
    if (onRefresh) onRefresh()
    const autoRefreshTimer = setInterval(() => {
      if (onRefresh) onRefresh()
    }, 60000)
    return () => clearInterval(autoRefreshTimer)
  }, [onRefresh])

  // Solo traslados PENDIENTES en la Central de Camilleros (Realizados y No Realizados van al Historial)
  const activeRequests = useMemo(() => {
    return requests.filter((r) => String(r.status || '').toUpperCase() === 'PENDIENTE')
  }, [requests])

  const pendingCount = activeRequests.length

  const visibleRequests = useMemo(() => {
    return activeRequests.filter((request) => {
      const matchesService = service === 'TODOS' || request.service === service
      const matchesQuery =
        !query ||
        [request.patient, request.record, request.location, request.destination, request.observation, request.mover, request.centralObservation]
          .some((val) => val && val.toLowerCase().includes(query.toLowerCase()))
      return matchesService && matchesQuery
    })
  }, [activeRequests, service, query])

  const triggerRefresh = () => {
    setRefreshState('refreshing')
    if (onRefresh) onRefresh()
    setTimeout(() => {
      setRefreshState('success')
      setTimeout(() => setRefreshState('idle'), 1000)
    }, 300)
  }

  const handleOpenEdit = (request) => {
    setEditError('')
    setEditRequest(request)
    setEditDraft({
      status: request.status || 'PENDIENTE',
      mover: request.mover && request.mover !== 'sin asignar' && request.mover !== 'Sin asignar' ? request.mover : '',
      centralObservation: request.centralObservation || '',
    })
  }

  const handleSaveEdit = () => {
    if (!editRequest) return

    const moverClean = (editDraft.mover || '').trim()
    if (!moverClean || moverClean.toLowerCase() === 'sin asignar') {
      setEditError('Es obligatorio seleccionar un camillero de la lista.')
      return
    }

    if (String(editDraft.status || '').toUpperCase() === 'NO REALIZADO') {
      if (!editDraft.centralObservation || !editDraft.centralObservation.trim()) {
        setEditError('Es obligatorio ingresar la observación o motivo por el cual no se realizó el traslado.')
        return
      }
    }
    setEditError('')

    let updatedMovementTime = editRequest.movementTime || 'Pendiente'
    let updatedAssignmentTime = editRequest.assignmentTime || null

    if (moverClean && moverClean.toLowerCase() !== 'sin asignar' && !updatedAssignmentTime) {
      updatedAssignmentTime = new Date().toLocaleString('es-CO')
    }

    if (editDraft.status === 'REALIZADO') {
      updatedMovementTime =
        editRequest.movementTime && editRequest.movementTime !== 'Pendiente' && editRequest.movementTime !== 'pendiente'
          ? editRequest.movementTime
          : new Date().toLocaleString('es-CO')
      if (!updatedAssignmentTime) {
        updatedAssignmentTime = updatedMovementTime
      }
    }

    if (editDraft.status === 'NO REALIZADO') {
      if (!updatedMovementTime || updatedMovementTime === 'Pendiente' || updatedMovementTime === 'pendiente') {
        updatedMovementTime = new Date().toLocaleString('es-CO')
      }
    }

    const updated = requests.map((item) => {
      if (item.id === editRequest.id) {
        return {
          ...item,
          status: editDraft.status,
          mover: moverClean,
          centralObservation: editDraft.centralObservation.trim(),
          movementTime: updatedMovementTime,
          assignmentTime: updatedAssignmentTime,
        }
      }
      return item
    })

    const editedItem = updated.find((r) => r.id === editRequest.id)
    onUpdate(updated, editedItem)
    setEditRequest(null)
  }

  // Regla: si el traslado está en REALIZADO o NO REALIZADO y ya tiene camillero asignado, no se puede cambiar el camillero
  const isMoverLocked = Boolean(
    editRequest &&
    (editDraft.status === 'REALIZADO' || editDraft.status === 'NO REALIZADO') &&
    editRequest.mover &&
    editRequest.mover !== 'sin asignar' &&
    editRequest.mover !== 'Sin asignar'
  )

  return (
    <section className="dashboard-page" aria-labelledby="dashboard-title">
      <header className="dashboard-hero-banner">
        <div className="banner-text">
          <p className="eyebrow">CENTRAL DE TRASLADOS</p>
          <h1 id="dashboard-title">Central de camilleros</h1>
          <p className="dashboard-subtitle">Consulta y gestiona las solicitudes de traslado activas de la institución.</p>
        </div>
        <div className="banner-right">
          <img className="banner-logo" src="/logooo-Photoroom.png" alt="Clínica Nueva de Cali" />
        </div>
      </header>
      <div className="dashboard-stats">
        <div className="pending-stat"><span>Solicitudes Pendientes Activas</span><strong>{pendingCount}</strong></div>
      </div>
      <div className="dashboard-toolbar">
        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar paciente, registro u observación" />
        </label>
        <label className="filter-select">
          <span>Servicio</span>
          <select value={service} onChange={(e) => setService(e.target.value)}>
            <option value="TODOS">Todos los servicios</option>
            {services.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <button type="button" className="analytics-link-btn history-nav-btn" onClick={() => onNavigate('history')} title="Ver historial de traslados">
          Historial
        </button>
      </div>
      <div className="table-card">
        <div className="table-caption">
          <div className="table-caption-left">
            <div>
              <strong>Solicitudes Activas de Traslado</strong>
              <span>{visibleRequests.length} resultados</span>
            </div>
            <button
              type="button"
              className={`refresh-btn ${refreshState}`}
              onClick={triggerRefresh}
              title="Actualizar lista de solicitudes"
            >
              <span className="refresh-icon" aria-hidden="true">↻</span>
              <span>
                {refreshState === 'refreshing'
                  ? 'Actualizando...'
                  : refreshState === 'success'
                  ? '¡Actualizado!'
                  : 'Actualizar'}
              </span>
            </button>
          </div>
          <span className="table-hint">Usa "Editar" para asignar camillero, cambiar estado y agregar observaciones</span>
        </div>
        <div className="table-scroll">
          <table className="compact-movement-table">
            <thead>
              <tr>
                <th>Nombre de paciente</th>
                <th>Ubicación específica</th>
                <th>Destino</th>
                <th>Prioridad</th>
                <th>Confirmación de movimiento</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {visibleRequests.map((request) => (
                <tr key={request.id} className={request.status === 'PENDIENTE' ? 'pending-row' : ''}>
                  <td><strong>{request.patient}</strong></td>
                  <td>{request.location}</td>
                  <td>{request.destination}</td>
                  <td>
                    <span className={`priority-badge priority-${(request.priority || 'media').toLowerCase()}`}>
                      {(request.priority || 'media').toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className={`badge-pill ${request.status === 'PENDIENTE' ? 'pill-purple' : request.status === 'NO REALIZADO' ? 'pill-orange' : 'pill-green'}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="row-actions">
                    <button className="details-button" type="button" onClick={() => setDetailRequest(request)}>
                      Detalles
                    </button>
                    <button className="edit-button" type="button" onClick={() => handleOpenEdit(request)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
              {!visibleRequests.length && (
                <tr>
                  <td colSpan={6} className="empty-state">No hay traslados activos con estos filtros.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETALLES */}
      {detailRequest && (
        <div className="modal-overlay" onClick={() => setDetailRequest(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2>Detalles de la Solicitud</h2>
              <button type="button" className="close-modal-btn" onClick={() => setDetailRequest(null)}>✕</button>
            </header>
            <div className="modal-grid">
              <div className="detail-item"><span>ID de Solicitud</span><strong className="id-highlight">{detailRequest.requestId || 'TR-1000'}</strong></div>
              <div className="detail-item"><span>Marca temporal</span><strong>{detailRequest.timestamp}</strong></div>
              <div className="detail-item"><span>Hora tomada / asignada</span><strong>{detailRequest.assignmentTime || 'Pendiente'}</strong></div>
              <div className="detail-item"><span>Oportunidad de Servicio</span><strong>{detailRequest.status === 'REALIZADO' ? detailRequest.movementTime : 'Pendiente'}</strong></div>
              <div className="detail-item"><span>Prioridad</span><strong className={`priority-badge priority-${(detailRequest.priority || 'media').toLowerCase()}`}>{(detailRequest.priority || 'media').toUpperCase()}</strong></div>
              <div className="detail-item"><span>Nombre de paciente</span><strong>{detailRequest.patient}</strong></div>
              <div className="detail-item"><span>Registro</span><strong>{detailRequest.record}</strong></div>
              <div className="detail-item"><span>Servicio que solicita</span><strong>{detailRequest.service}</strong></div>
              <div className="detail-item"><span>Ubicación específica</span><strong>{detailRequest.location}</strong></div>
              <div className="detail-item"><span>Destino</span><strong>{detailRequest.destination}</strong></div>
              <div className="detail-item"><span>Medio de transporte</span><strong>{detailRequest.transport}</strong></div>
              <div className="detail-item"><span>Soporte de O2</span><strong>{detailRequest.oxygen}</strong></div>
              <div className="detail-item full-width"><span>Observaciones solicitud</span><strong>{detailRequest.observation || 'Sin observaciones'}</strong></div>
              <div className="detail-item"><span>Confirmación de movimiento</span><strong className={`status-badge-tag ${detailRequest.status.toLowerCase().replaceAll(' ', '-')}`}>{detailRequest.status}</strong></div>
              <div className="detail-item"><span>Camillero que realiza</span><strong>{detailRequest.mover}</strong></div>
              <div className="detail-item full-width"><span>Observación camilleros</span><strong>{detailRequest.centralObservation || 'Sin observación'}</strong></div>
            </div>
            <footer className="modal-footer">
              <button className="submit-button" type="button" onClick={() => setDetailRequest(null)}>Cerrar</button>
            </footer>
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}
      {editRequest && (
        <div className="modal-overlay" onClick={() => setEditRequest(null)}>
          <div className="modal-card edit-modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2>Editar Gestión de Traslado</h2>
              <button type="button" className="close-modal-btn" onClick={() => setEditRequest(null)}>✕</button>
            </header>
            
            <div className="edit-modal-summary-banner">
              <div className="summary-item">
                <span>ID de Solicitud</span>
                <strong className="id-highlight">{editRequest.requestId || 'TR-1000'}</strong>
              </div>
              <div className="summary-item">
                <span>Prioridad</span>
                <strong className={`priority-badge priority-${(editRequest.priority || 'media').toLowerCase()}`}>
                  {(editRequest.priority || 'media').toUpperCase()}
                </strong>
              </div>
              <div className="summary-item">
                <span>Paciente</span>
                <strong>{editRequest.patient}</strong>
              </div>
              <div className="summary-item">
                <span>Ubicación</span>
                <strong>{editRequest.location}</strong>
              </div>
              <div className="summary-item">
                <span>Destino</span>
                <strong>{editRequest.destination}</strong>
              </div>
            </div>

            <div className="edit-modal-form-body">
              <div className="edit-form-field">
                <label className="edit-field-label">Confirmación de movimiento (Estado)</label>
                <select
                  className="edit-modal-select"
                  value={editDraft.status}
                  onChange={(e) => {
                    setEditDraft({ ...editDraft, status: e.target.value })
                    if (e.target.value !== 'NO REALIZADO') setEditError('')
                  }}
                >
                  <option value="PENDIENTE">PENDIENTE (Permanece en Central)</option>
                  <option value="REALIZADO">REALIZADO (Pasa al historial)</option>
                  <option value="NO REALIZADO">NO REALIZADO (Pasa al historial)</option>
                </select>
              </div>

              <div className="edit-form-field">
                <label className="edit-field-label">
                  Camillero que realiza <span style={{ color: '#ef4444', fontWeight: 'bold' }}>* (Obligatorio)</span>
                </label>
                {isMoverLocked ? (
                  <div className="locked-field-box">
                    <input
                      type="text"
                      className="edit-modal-input disabled-locked"
                      value={editDraft.mover}
                      disabled
                      readOnly
                    />
                    <span className="lock-notice">🔒 Camillero no modificable en estado {editDraft.status}</span>
                  </div>
                ) : (
                  <select
                    className={`edit-modal-select ${editError && (!editDraft.mover || editDraft.mover === 'sin asignar') ? 'has-error-border' : ''}`}
                    value={editDraft.mover}
                    onChange={(e) => {
                      setEditDraft({ ...editDraft, mover: e.target.value })
                      if (e.target.value) setEditError('')
                    }}
                  >
                    <option value="">-- Selecciona un camillero de la lista * --</option>
                    {(camilleros || []).map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="edit-form-field">
                <label className="edit-field-label">
                  Observación camilleros {editDraft.status === 'NO REALIZADO' && <span style={{ color: '#ef4444', fontWeight: 'bold' }}>* (Obligatorio)</span>}
                </label>
                <textarea
                  className={`edit-modal-textarea ${editError ? 'has-error-border' : ''}`}
                  rows={3}
                  value={editDraft.centralObservation}
                  onChange={(e) => {
                    setEditDraft({ ...editDraft, centralObservation: e.target.value })
                    if (e.target.value.trim()) setEditError('')
                  }}
                  placeholder={editDraft.status === 'NO REALIZADO' ? 'Especifique obligatoriamente el motivo por el cual no se realizó el traslado...' : 'Observaciones de la central o del camillero...'}
                />
                {editError && (
                  <div className="field-error" style={{ marginTop: '8px', color: '#ef4444', fontWeight: 600, fontSize: '0.88rem' }}>
                    <span className="error-icon">!</span> {editError}
                  </div>
                )}
              </div>
            </div>

            <footer className="modal-footer edit-modal-footer">
              <button className="clear-button" type="button" onClick={() => setEditRequest(null)}>
                Cancelar
              </button>
              <button className="submit-button" type="button" onClick={handleSaveEdit}>
                Guardar cambios
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  )
}

function TablePagination({ currentPage, totalItems, pageSize = 10, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  if (totalItems === 0) return null

  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  const getPageNumbers = () => {
    const pages = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('...')
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (currentPage < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div className="table-pagination-footer">
      <div className="pagination-info">
        Mostrando <strong>{startItem} - {endItem}</strong> de <strong>{totalItems}</strong> registros (Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>)
      </div>
      <div className="pagination-controls">
        <button
          type="button"
          className="pagination-btn"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          title="Página anterior"
        >
          ← Anterior
        </button>
        <div className="pagination-pages-list">
          {getPageNumbers().map((p, idx) => (
            p === '...' ? (
              <span key={`ellipsis-${idx}`} className="pagination-ellipsis">...</span>
            ) : (
              <button
                key={p}
                type="button"
                className={`pagination-page-number ${currentPage === p ? 'active' : ''}`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            )
          ))}
        </div>
        <button
          type="button"
          className="pagination-btn"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          title="Página siguiente"
        >
          Siguiente →
        </button>
      </div>
    </div>
  )
}

function HistoryPage({ requests, onRefresh, onNavigate }) {
  const [query, setQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('TODOS')
  const [selectedMonth, setSelectedMonth] = useState('TODOS')
  const [selectedYear, setSelectedYear] = useState('TODOS')
  const [selectedService, setSelectedService] = useState('TODOS')
  const [selectedMover, setSelectedMover] = useState('TODOS')
  const [selectedPriority, setSelectedPriority] = useState('TODOS')
  const [selectedTransport, setSelectedTransport] = useState('TODOS')
  const [selectedOxygen, setSelectedOxygen] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [refreshState, setRefreshState] = useState('idle')
  const [detailRequest, setDetailRequest] = useState(null)

  useEffect(() => {
    if (onRefresh) onRefresh()
    const autoRefreshTimer = setInterval(() => {
      if (onRefresh) onRefresh()
    }, 60000)
    return () => clearInterval(autoRefreshTimer)
  }, [onRefresh])

  useEffect(() => {
    setCurrentPage(1)
  }, [query, selectedStatus, selectedMonth, selectedYear, selectedService, selectedMover, selectedPriority, selectedTransport, selectedOxygen])

  const monthNamesList = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const availableMonths = useMemo(() => {
    const monthsSet = new Set()
    for (const req of requests) {
      if (req.timestamp) {
        const date = parseCODate(req.timestamp)
        if (date) monthsSet.add(monthNamesList[date.getMonth()])
      }
    }
    return monthNamesList.filter((m) => monthsSet.has(m))
  }, [requests])

  const availableYears = useMemo(() => {
    const yearsSet = new Set()
    for (const req of requests) {
      if (req.timestamp) {
        const date = parseCODate(req.timestamp)
        if (date) yearsSet.add(date.getFullYear().toString())
      }
    }
    return Array.from(yearsSet).sort((a, b) => b - a)
  }, [requests])

  const availableServices = useMemo(() => {
    const set = new Set()
    for (const req of requests) {
      if (req.service) set.add(req.service)
    }
    return Array.from(set).sort()
  }, [requests])

  const availableMovers = useMemo(() => {
    const set = new Set()
    for (const req of requests) {
      if (req.mover && req.mover !== 'sin asignar' && req.mover !== 'Sin asignar') {
        set.add(req.mover)
      }
    }
    return Array.from(set).sort()
  }, [requests])

  const historyRequests = useMemo(() => {
    return requests.filter((r) => {
      const st = String(r.status || '').toUpperCase()
      return st === 'REALIZADO' || st === 'NO REALIZADO'
    })
  }, [requests])

  const filteredRequests = useMemo(() => {
    return historyRequests.filter((req) => {
      const date = parseCODate(req.timestamp)
      
      if (selectedStatus !== 'TODOS') {
        if (String(req.status || '').toUpperCase() !== selectedStatus.toUpperCase()) return false
      }

      if (date) {
        if (selectedMonth !== 'TODOS') {
          const reqMonth = monthNamesList[date.getMonth()]
          if (reqMonth !== selectedMonth) return false
        }
        if (selectedYear !== 'TODOS') {
          if (date.getFullYear().toString() !== selectedYear) return false
        }
      }

      if (selectedService !== 'TODOS' && (req.service || '').toLowerCase() !== selectedService.toLowerCase()) return false
      if (selectedMover !== 'TODOS' && (req.mover || '').toLowerCase() !== selectedMover.toLowerCase()) return false
      if (selectedPriority !== 'TODOS' && (req.priority || 'media').toLowerCase() !== selectedPriority.toLowerCase()) return false
      if (selectedTransport !== 'TODOS' && (req.transport || '').toLowerCase() !== selectedTransport.toLowerCase()) return false
      if (selectedOxygen !== 'TODOS' && (req.oxygen || '').toLowerCase() !== selectedOxygen.toLowerCase()) return false

      if (query.trim()) {
        const q = query.toLowerCase().trim()
        const haystack = `${req.requestId || ''} ${req.patient || ''} ${req.record || ''} ${req.location || ''} ${req.destination || ''} ${req.service || ''} ${req.mover || ''} ${req.priority || ''} ${req.observation || ''} ${req.centralObservation || ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }

      return true
    })
  }, [historyRequests, query, selectedStatus, selectedMonth, selectedYear, selectedService, selectedMover, selectedPriority, selectedTransport, selectedOxygen])

  const totalCount = filteredRequests.length
  const completedCount = filteredRequests.filter((r) => String(r.status || '').toUpperCase() === 'REALIZADO').length
  const notRealizedCount = filteredRequests.filter((r) => String(r.status || '').toUpperCase() === 'NO REALIZADO').length

  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * 10
    return filteredRequests.slice(start, start + 10)
  }, [filteredRequests, currentPage])

  const avgDuration = useMemo(() => {
    let sum = 0, count = 0
    for (const req of filteredRequests) {
      if (String(req.status || '').toUpperCase() === 'REALIZADO') {
        const dur = calculateDurationMinutes(req.timestamp, req.movementTime)
        if (dur !== null) {
          sum += dur
          count++
        }
      }
    }
    return count > 0 ? Math.round(sum / count) : 0
  }, [filteredRequests])

  const triggerRefresh = () => {
    setRefreshState('refreshing')
    if (onRefresh) onRefresh()
    setTimeout(() => {
      setRefreshState('success')
      setTimeout(() => setRefreshState('idle'), 1000)
    }, 300)
  }

  return (
    <section className="dashboard-page history-page" aria-labelledby="history-title">
      <header className="dashboard-hero-banner">
        <div className="banner-text">
          <p className="eyebrow">REGISTRO HISTÓRICO Y AUDITORÍA</p>
          <h1 id="history-title">Historial de traslados</h1>
          <p className="dashboard-subtitle">
            Consulta detallada de todos los traslados realizados y no realizados con información completa, filtros y auditoría.
          </p>
        </div>
        <div className="banner-right">
          <img className="banner-logo" src="/logooo-Photoroom.png" alt="Clínica Nueva de Cali" />
        </div>
      </header>

      <div className="history-nav-bar">
        <button type="button" className="analytics-link-btn" onClick={() => onNavigate('dashboard')}>
          Central de camilleros
        </button>
      </div>

      <div className="dashboard-stats history-stats">
        <div><span>Total en historial</span><strong>{totalCount}</strong></div>
        <div><span>Realizados</span><strong>{completedCount}</strong></div>
        <div className="not-realized-stat"><span>No realizados</span><strong style={{ color: '#d97706' }}>{notRealizedCount}</strong></div>
        <div className="highlight-kpi-small"><span>Tiempo promedio</span><strong>{formatDuration(avgDuration)}</strong></div>
      </div>

      <div className="analytics-toolbar history-toolbar">
        <label className="search-box history-search">
          <span aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ID único (TR-1001), paciente, registro, destino..."
          />
        </label>

        <label className="filter-select">
          <span>Estado</span>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option value="TODOS">Todos (Realizados y No realizados)</option>
            <option value="REALIZADO">Realizados</option>
            <option value="NO REALIZADO">No realizados</option>
          </select>
        </label>

        <label className="filter-select">
          <span>Mes</span>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            <option value="TODOS">Todos los meses</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>

        <label className="filter-select">
          <span>Año</span>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            <option value="TODOS">Todos los años</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>

        <label className="filter-select">
          <span>Servicio</span>
          <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)}>
            <option value="TODOS">Todos los servicios</option>
            {availableServices.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <label className="filter-select">
          <span>Camillero</span>
          <select value={selectedMover} onChange={(e) => setSelectedMover(e.target.value)}>
            <option value="TODOS">Todos los camilleros</option>
            {availableMovers.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>

        <label className="filter-select">
          <span>Prioridad</span>
          <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)}>
            <option value="TODOS">Todas</option>
            <option value="alta">alta</option>
            <option value="media">media</option>
            <option value="baja">baja</option>
          </select>
        </label>

        <label className="filter-select">
          <span>Transporte</span>
          <select value={selectedTransport} onChange={(e) => setSelectedTransport(e.target.value)}>
            <option value="TODOS">Todos</option>
            <option value="silla de ruedas">silla de ruedas</option>
            <option value="cama">cama</option>
            <option value="camilla ambulancia">camilla ambulancia</option>
          </select>
        </label>

        <label className="filter-select">
          <span>Soporte O2</span>
          <select value={selectedOxygen} onChange={(e) => setSelectedOxygen(e.target.value)}>
            <option value="TODOS">Todos</option>
            <option value="si">si</option>
            <option value="no">no</option>
          </select>
        </label>

        <button
          type="button"
          className={`refresh-btn ${refreshState}`}
          onClick={triggerRefresh}
          title="Actualizar datos"
        >
          <span className="refresh-icon" aria-hidden="true">↻</span>
          <span>{refreshState === 'refreshing' ? 'Actualizando...' : refreshState === 'success' ? '¡Actualizado!' : 'Actualizar'}</span>
        </button>
      </div>

      <div className="table-card">
        <div className="table-caption">
          <div className="table-caption-left">
            <div>
              <strong>Historial Completo de Traslados</strong>
              <span>{filteredRequests.length} registros con toda la información</span>
            </div>
          </div>
          <span className="table-hint">Haz clic en Detalles para ver la ficha individual completa</span>
        </div>
        <div className="mobile-scroll-hint">
          <span>↔</span> Desliza la tabla horizontalmente para ver todos los campos
        </div>
        <div className="table-scroll">
          <table className="compact-movement-table history-full-table">
            <thead>
              <tr>
                <th>ID Único</th>
                <th>Fecha Solicitud</th>
                <th>Hora Tomada</th>
                <th>Hora Realización</th>
                <th>Oportunidad de Servicio</th>
                <th>Oportunidad de Traslado</th>
                <th>Oportunidad Global</th>
                <th>Prioridad</th>
                <th>Paciente</th>
                <th>Registro</th>
                <th>Servicio Solicitante</th>
                <th>Ubicación</th>
                <th>Destino</th>
                <th>Transporte</th>
                <th>Soporte O2</th>
                <th>Observaciones Solicitud</th>
                <th>Estado</th>
                <th>Camillero</th>
                <th>Observación Camilleros</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRequests.map((req) => {
                const isCompleted = req.status === 'REALIZADO'
                const serviceDur = isCompleted ? calculateDurationMinutes(req.assignmentTime || req.timestamp, req.movementTime) : null
                const reactDur = calculateDurationMinutes(req.timestamp, req.assignmentTime || (isCompleted ? req.movementTime : null))
                const totalDur = isCompleted ? calculateDurationMinutes(req.timestamp, req.movementTime) : null
                const badgeClass = totalDur === null ? '' : totalDur <= 15 ? 'fast-duration' : totalDur <= 35 ? 'medium-duration' : 'slow-duration'
                return (
                  <tr key={req.id} className={req.status === 'PENDIENTE' ? 'pending-row' : ''}>
                    <td><strong className="id-badge-tag">{req.requestId || 'TR-1000'}</strong></td>
                    <td>{req.timestamp}</td>
                    <td>{req.assignmentTime || 'Pendiente'}</td>
                    <td>{isCompleted ? req.movementTime : 'Pendiente'}</td>
                    <td>
                      <span className={`badge-pill ${isCompleted && serviceDur !== null ? 'pill-blue' : 'pill-gray'}`}>
                        {isCompleted && serviceDur !== null ? formatDuration(serviceDur) : '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-pill ${reactDur !== null ? 'pill-purple' : 'pill-gray'}`}>
                        {reactDur !== null ? formatDuration(reactDur) : '—'}
                      </span>
                    </td>
                    <td>
                      {isCompleted && totalDur !== null ? (
                        <span className={`duration-badge ${badgeClass}`}>{formatDuration(totalDur)}</span>
                      ) : (
                        <span className="duration-badge">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`priority-badge priority-${(req.priority || 'media').toLowerCase()}`}>
                        {(req.priority || 'media').toUpperCase()}
                      </span>
                    </td>
                    <td><strong>{req.patient}</strong></td>
                    <td>{req.record}</td>
                    <td>{req.service}</td>
                    <td>{req.location}</td>
                    <td>{req.destination}</td>
                    <td>{req.transport}</td>
                    <td>{req.oxygen}</td>
                    <td>{req.observation || '—'}</td>
                    <td className={`status-cell ${req.status.toLowerCase().replaceAll(' ', '-')}`}>{req.status}</td>
                    <td><strong>{req.mover}</strong></td>
                    <td>{req.centralObservation || '—'}</td>
                    <td className="row-actions">
                      <button className="details-button" type="button" onClick={() => setDetailRequest(req)}>
                        Detalles
                      </button>
                    </td>
                  </tr>
                )
              })}
              {!filteredRequests.length && (
                <tr>
                  <td colSpan={20} className="empty-state">No se encontraron traslados con los filtros seleccionados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={currentPage}
          totalItems={filteredRequests.length}
          pageSize={10}
          onPageChange={setCurrentPage}
        />
      </div>

      {detailRequest && (
        <div className="modal-overlay" onClick={() => setDetailRequest(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2>Detalles de la Solicitud</h2>
              <button type="button" className="close-modal-btn" onClick={() => setDetailRequest(null)}>✕</button>
            </header>
            <div className="modal-grid">
              <div className="detail-item"><span>ID de Solicitud</span><strong className="id-highlight">{detailRequest.requestId || 'TR-1000'}</strong></div>
              <div className="detail-item"><span>Marca temporal</span><strong>{detailRequest.timestamp}</strong></div>
              <div className="detail-item"><span>Hora tomada / asignada</span><strong>{detailRequest.assignmentTime || 'Pendiente'}</strong></div>
              <div className="detail-item"><span>Oportunidad de Servicio</span><strong>{detailRequest.status === 'REALIZADO' ? detailRequest.movementTime : 'Pendiente'}</strong></div>
              <div className="detail-item"><span>Prioridad</span><strong className={`priority-badge priority-${(detailRequest.priority || 'media').toLowerCase()}`}>{(detailRequest.priority || 'media').toUpperCase()}</strong></div>
              <div className="detail-item"><span>Nombre de paciente</span><strong>{detailRequest.patient}</strong></div>
              <div className="detail-item"><span>Registro</span><strong>{detailRequest.record}</strong></div>
              <div className="detail-item"><span>Servicio que solicita</span><strong>{detailRequest.service}</strong></div>
              <div className="detail-item"><span>Ubicación específica</span><strong>{detailRequest.location}</strong></div>
              <div className="detail-item"><span>Destino</span><strong>{detailRequest.destination}</strong></div>
              <div className="detail-item"><span>Medio de transporte</span><strong>{detailRequest.transport}</strong></div>
              <div className="detail-item"><span>Soporte de O2</span><strong>{detailRequest.oxygen}</strong></div>
              <div className="detail-item full-width"><span>Observaciones solicitud</span><strong>{detailRequest.observation || 'Sin observaciones'}</strong></div>
              <div className="detail-item"><span>Confirmación de movimiento</span><strong className={`status-badge-tag ${detailRequest.status.toLowerCase().replaceAll(' ', '-')}`}>{detailRequest.status}</strong></div>
              <div className="detail-item"><span>Camillero que realiza</span><strong>{detailRequest.mover}</strong></div>
              <div className="detail-item full-width"><span>Observación camilleros</span><strong>{detailRequest.centralObservation || 'Sin observación'}</strong></div>
            </div>
            <footer className="modal-footer">
              <button className="submit-button" type="button" onClick={() => setDetailRequest(null)}>Cerrar</button>
            </footer>
          </div>
        </div>
      )}
    </section>
  )
}

function AnalyticsPage({ requests: initialRequests, camilleros = [], onUpdateCamilleros, onRefresh, onNavigate }) {
  const [requests, setRequests] = useState(initialRequests || readRequests)
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return window.sessionStorage.getItem('indicadores_auth') === 'true'
  })
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [query, setQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('TODOS')
  const [selectedMonth, setSelectedMonth] = useState('TODOS')
  const [selectedYear, setSelectedYear] = useState('TODOS')
  const [selectedService, setSelectedService] = useState('TODOS')
  const [selectedMover, setSelectedMover] = useState('TODOS')
  const [selectedPriority, setSelectedPriority] = useState('TODOS')
  const [selectedOxygen, setSelectedOxygen] = useState('TODOS')
  const [selectedTransport, setSelectedTransport] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [newCamilleroName, setNewCamilleroName] = useState('')
  const [showCamillerosModal, setShowCamillerosModal] = useState(false)
  const [refreshState, setRefreshState] = useState('idle')

  const handlePasswordSubmit = (e) => {
    e?.preventDefault()
    if (passwordInput.trim() === 'CNC2026') {
      setIsAuthenticated(true)
      window.sessionStorage.setItem('indicadores_auth', 'true')
      setPasswordError('')
    } else {
      setPasswordError('Contraseña incorrecta. Verifica e intenta de nuevo.')
    }
  }

  useEffect(() => {
    if (initialRequests) setRequests(initialRequests)
  }, [initialRequests])

  useEffect(() => {
    setCurrentPage(1)
  }, [query, selectedStatus, selectedMonth, selectedYear, selectedService, selectedMover, selectedPriority, selectedOxygen, selectedTransport])

  useEffect(() => {
    const liveTimer = setInterval(() => {
      const freshReqs = readRequests()
      setRequests(freshReqs)
      if (onRefresh) onRefresh()
    }, 1000)
    return () => clearInterval(liveTimer)
  }, [onRefresh])

  const handleAddCamillero = (e) => {
    e.preventDefault()
    const cleanName = formatLowercase(newCamilleroName.trim())
    if (cleanName && !(camilleros || []).includes(cleanName)) {
      const next = [...(camilleros || []), cleanName]
      setNewCamilleroName('')
      if (onUpdateCamilleros) {
        onUpdateCamilleros(next, cleanName, null)
      }
    }
  }

  const handleRemoveCamillero = (nameToRemove) => {
    const next = (camilleros || []).filter((c) => c !== nameToRemove)
    if (onUpdateCamilleros) {
      onUpdateCamilleros(next, null, nameToRemove)
    }
  }

  const triggerRefresh = () => {
    setRefreshState('refreshing')
    const freshReqs = readRequests()
    setRequests(freshReqs)
    if (onRefresh) onRefresh()
    setTimeout(() => {
      setRefreshState('success')
      setTimeout(() => setRefreshState('idle'), 1000)
    }, 300)
  }

  const availableMonths = useMemo(() => {
    const monthsSet = new Set()
    for (const req of requests) {
      if (req.timestamp) {
        const date = parseCODate(req.timestamp)
        if (date) monthsSet.add(monthNames[date.getMonth()])
      }
    }
    return monthNames.filter((m) => monthsSet.has(m))
  }, [requests])

  const availableYears = useMemo(() => {
    const yearsSet = new Set()
    for (const req of requests) {
      if (req.timestamp) {
        const date = parseCODate(req.timestamp)
        if (date) yearsSet.add(date.getFullYear().toString())
      }
    }
    return Array.from(yearsSet).sort((a, b) => b - a)
  }, [requests])

  const availableServices = useMemo(() => {
    const set = new Set()
    for (const req of requests) {
      if (req.service) set.add(req.service)
    }
    return Array.from(set).sort()
  }, [requests])

  const availableMovers = useMemo(() => {
    const set = new Set()
    for (const req of requests) {
      if (req.mover && req.mover !== 'sin asignar' && req.mover !== 'Sin asignar') {
        set.add(req.mover)
      }
    }
    return Array.from(set).sort()
  }, [requests])

  const filteredRequests = useMemo(() => {
    const q = query.trim().toLowerCase()
    return requests.filter((req) => {
      const date = parseCODate(req.timestamp)

      if (date) {
        if (selectedMonth !== 'TODOS') {
          const reqMonth = monthNames[date.getMonth()]
          if (reqMonth !== selectedMonth) return false
        }
        if (selectedYear !== 'TODOS') {
          if (date.getFullYear().toString() !== selectedYear) return false
        }
      }

      if (selectedStatus !== 'TODOS') {
        if (String(req.status || '').toUpperCase() !== selectedStatus.toUpperCase()) return false
      }

      if (selectedService !== 'TODOS') {
        if ((req.service || '').toLowerCase().trim() !== selectedService.toLowerCase().trim()) return false
      }

      if (selectedMover !== 'TODOS') {
        if ((req.mover || '').toLowerCase().trim() !== selectedMover.toLowerCase().trim()) return false
      }

      if (selectedPriority !== 'TODOS') {
        if ((req.priority || 'media').toLowerCase().trim() !== selectedPriority.toLowerCase().trim()) return false
      }

      if (selectedOxygen !== 'TODOS') {
        if ((req.oxygen || '').toLowerCase().trim() !== selectedOxygen.toLowerCase().trim()) return false
      }

      if (selectedTransport !== 'TODOS') {
        if ((req.transport || '').toLowerCase().trim() !== selectedTransport.toLowerCase().trim()) return false
      }

      if (q) {
        const idMatch = (req.requestId || '').toLowerCase().includes(q)
        const patientMatch = (req.patient || '').toLowerCase().includes(q)
        const recordMatch = (req.record || '').toLowerCase().includes(q)
        const destMatch = (req.destination || '').toLowerCase().includes(q)
        const obsMatch = (req.observation || '').toLowerCase().includes(q)
        const centralObsMatch = (req.centralObservation || '').toLowerCase().includes(q)
        const moverMatch = (req.mover || '').toLowerCase().includes(q)
        const priorityMatch = (req.priority || '').toLowerCase().includes(q)
        if (!idMatch && !patientMatch && !recordMatch && !destMatch && !obsMatch && !centralObsMatch && !moverMatch && !priorityMatch) {
          return false
        }
      }

      return true
    })
  }, [requests, selectedMonth, selectedYear, selectedStatus, selectedService, selectedMover, selectedPriority, selectedOxygen, selectedTransport, query])

  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * 10
    return filteredRequests.slice(start, start + 10)
  }, [filteredRequests, currentPage])

  const totalCompleted = filteredRequests.filter((r) => String(r.status || '').toUpperCase() === 'REALIZADO').length
  const totalPending = filteredRequests.filter((r) => String(r.status || '').toUpperCase() === 'PENDIENTE').length
  const totalNotRealized = filteredRequests.filter((r) => String(r.status || '').toUpperCase() === 'NO REALIZADO').length

  const totalServiceMinutes = useMemo(() => {
    let sum = 0, count = 0
    for (const req of filteredRequests) {
      if (req.status === 'REALIZADO') {
        const dur = calculateDurationMinutes(req.assignmentTime || req.timestamp, req.movementTime)
        if (dur !== null) {
          sum += dur
          count++
        }
      }
    }
    return count > 0 ? Math.round(sum / count) : 0
  }, [filteredRequests])

  const totalReactionMinutes = useMemo(() => {
    let sum = 0, count = 0
    for (const req of filteredRequests) {
      const reactTime = req.assignmentTime || (req.status === 'REALIZADO' ? req.movementTime : null)
      const dur = calculateDurationMinutes(req.timestamp, reactTime)
      if (dur !== null) {
        sum += dur
        count++
      }
    }
    return count > 0 ? Math.round(sum / count) : 0
  }, [filteredRequests])

  const totalDurationMinutes = useMemo(() => {
    let sum = 0, count = 0
    for (const req of filteredRequests) {
      if (req.status === 'REALIZADO') {
        const dur = calculateDurationMinutes(req.timestamp, req.movementTime)
        if (dur !== null) {
          sum += dur
          count++
        }
      }
    }
    return count > 0 ? Math.round(sum / count) : 0
  }, [filteredRequests])

  const o2Stats = useMemo(() => {
    const calcCategory = (val) => {
      const list = filteredRequests.filter((r) => (r.oxygen || '').toLowerCase() === val)
      const total = filteredRequests.length
      const pct = total > 0 ? ((list.length / total) * 100).toFixed(1) : '0.0'
      return { count: list.length, pct }
    }
    return {
      withO2: calcCategory('si'),
      withoutO2: calcCategory('no'),
    }
  }, [filteredRequests])

  const transportStats = useMemo(() => {
    const calcCategory = (val) => {
      const list = filteredRequests.filter((r) => (r.transport || '').toLowerCase() === val)
      const total = filteredRequests.length
      const pct = total > 0 ? ((list.length / total) * 100).toFixed(1) : '0.0'

      let sumService = 0, countService = 0
      let sumReact = 0, countReact = 0
      let sumGlobal = 0, countGlobal = 0

      for (const req of list) {
        const reactDur = calculateDurationMinutes(req.timestamp, req.assignmentTime || (req.status === 'REALIZADO' ? req.movementTime : null))
        if (reactDur !== null) {
          sumReact += reactDur
          countReact += 1
        }
        if (req.status === 'REALIZADO') {
          const servDur = calculateDurationMinutes(req.assignmentTime || req.timestamp, req.movementTime)
          if (servDur !== null) {
            sumService += servDur
            countService += 1
          }
          const globDur = calculateDurationMinutes(req.timestamp, req.movementTime)
          if (globDur !== null) {
            sumGlobal += globDur
            countGlobal += 1
          }
        }
      }

      const avgService = countService > 0 ? Math.round(sumService / countService) : 0
      const avgReact = countReact > 0 ? Math.round(sumReact / countReact) : 0
      const avgGlobal = countGlobal > 0 ? Math.round(sumGlobal / countGlobal) : 0

      return { count: list.length, pct, avgService, avgReact, avgGlobal }
    }
    return {
      wheelchair: calcCategory('silla de ruedas'),
      bed: calcCategory('cama'),
      ambulance: calcCategory('camilla ambulancia'),
    }
  }, [filteredRequests])

  const priorityStats = useMemo(() => {
    const calcCategory = (val, colorClass) => {
      const list = filteredRequests.filter((r) => (r.priority || 'media').toLowerCase() === val)
      const total = filteredRequests.length
      const pct = total > 0 ? ((list.length / total) * 100).toFixed(1) : '0.0'

      let sumService = 0, countService = 0
      let sumReact = 0, countReact = 0
      let sumGlobal = 0, countGlobal = 0

      for (const req of list) {
        const reactDur = calculateDurationMinutes(req.timestamp, req.assignmentTime || (req.status === 'REALIZADO' ? req.movementTime : null))
        if (reactDur !== null) {
          sumReact += reactDur
          countReact += 1
        }
        if (req.status === 'REALIZADO') {
          const sDur = calculateDurationMinutes(req.assignmentTime || req.timestamp, req.movementTime)
          if (sDur !== null) {
            sumService += sDur
            countService += 1
          }
          const gDur = calculateDurationMinutes(req.timestamp, req.movementTime)
          if (gDur !== null) {
            sumGlobal += gDur
            countGlobal += 1
          }
        }
      }

      const avgService = countService > 0 ? Math.round(sumService / countService) : 0
      const avgReact = countReact > 0 ? Math.round(sumReact / countReact) : 0
      const avgGlobal = countGlobal > 0 ? Math.round(sumGlobal / countGlobal) : 0

      return { count: list.length, pct, avgService, avgReact, avgGlobal, colorClass }
    }
    return {
      alta: calcCategory('alta', 'fill-red'),
      media: calcCategory('media', 'fill-orange'),
      baja: calcCategory('baja', 'fill-green'),
    }
  }, [filteredRequests])

  const camilleroStats = useMemo(() => {
    const map = {}
    for (const name of (camilleros || [])) {
      map[name.toLowerCase().trim()] = { count: 0, serviceMins: 0, reactMins: 0, globalMins: 0, reactCount: 0, completedCount: 0 }
    }
    for (const req of filteredRequests) {
      if (req.mover && req.mover !== 'sin asignar' && req.mover !== 'Sin asignar') {
        const moverKey = req.mover.toLowerCase().trim()
        if (!map[moverKey]) {
          map[moverKey] = { count: 0, serviceMins: 0, reactMins: 0, globalMins: 0, reactCount: 0, completedCount: 0 }
        }
        const reactDur = calculateDurationMinutes(req.timestamp, req.assignmentTime || (req.status === 'REALIZADO' ? req.movementTime : null))
        if (reactDur !== null) {
          map[moverKey].reactMins += reactDur
          map[moverKey].reactCount += 1
        }
        map[moverKey].count += 1
        if (req.status === 'REALIZADO') {
          map[moverKey].completedCount += 1
          const servDur = calculateDurationMinutes(req.assignmentTime || req.timestamp, req.movementTime)
          if (servDur !== null) map[moverKey].serviceMins += servDur
          const gDur = calculateDurationMinutes(req.timestamp, req.movementTime)
          if (gDur !== null) map[moverKey].globalMins += gDur
        }
      }
    }
    const total = Object.values(map).reduce((acc, curr) => acc + curr.count, 0)
    const list = Object.entries(map).map(([name, data]) => {
      const pct = total > 0 ? ((data.count / total) * 100).toFixed(1) : '0.0'
      const avgService = data.completedCount > 0 ? Math.round(data.serviceMins / data.completedCount) : 0
      const avgReact = data.reactCount > 0 ? Math.round(data.reactMins / data.reactCount) : 0
      const avgGlobal = data.completedCount > 0 ? Math.round(data.globalMins / data.completedCount) : 0
      return {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        count: data.count,
        pct,
        avgService,
        avgReact,
        avgGlobal,
      }
    })
    return list.sort((a, b) => b.count - a.count)
  }, [filteredRequests, camilleros])

  // Gráfico por Servicios con Oportunidad Global, Servicio y Reacción
  const serviceStats = useMemo(() => {
    const map = {}
    for (const req of filteredRequests) {
      if (req.service) {
        const sName = req.service.trim()
        if (!map[sName]) {
          map[sName] = {
            count: 0,
            completedCount: 0,
            globalMins: 0,
            serviceMins: 0,
            reactMins: 0,
            reactCount: 0,
          }
        }
        map[sName].count += 1
        const reactDur = calculateDurationMinutes(req.timestamp, req.assignmentTime || (req.status === 'REALIZADO' ? req.movementTime : null))
        if (reactDur !== null) {
          map[sName].reactMins += reactDur
          map[sName].reactCount += 1
        }
        if (req.status === 'REALIZADO') {
          map[sName].completedCount += 1
          const gDur = calculateDurationMinutes(req.timestamp, req.movementTime)
          if (gDur !== null) map[sName].globalMins += gDur
          const sDur = calculateDurationMinutes(req.assignmentTime || req.timestamp, req.movementTime)
          if (sDur !== null) map[sName].serviceMins += sDur
        }
      }
    }
    const total = Object.values(map).reduce((acc, curr) => acc + curr.count, 0)
    const list = Object.entries(map).map(([name, data]) => {
      const pct = total > 0 ? ((data.count / total) * 100).toFixed(1) : '0.0'
      const avgGlobal = data.completedCount > 0 ? Math.round(data.globalMins / data.completedCount) : 0
      const avgService = data.completedCount > 0 ? Math.round(data.serviceMins / data.completedCount) : 0
      const avgReact = data.reactCount > 0 ? Math.round(data.reactMins / data.reactCount) : 0
      return {
        name,
        count: data.count,
        pct,
        avgGlobal,
        avgService,
        avgReact,
      }
    })
    return list.sort((a, b) => b.count - a.count)
  }, [filteredRequests])

  const handleExportExcel = () => {
    if (!filteredRequests.length) {
      alert('No hay solicitudes filtradas para exportar.')
      return
    }

    const rows = filteredRequests.map((req) => {
      const isCompleted = req.status === 'REALIZADO'
      const serviceDur = isCompleted ? calculateDurationMinutes(req.assignmentTime || req.timestamp, req.movementTime) : null
      const reactDur = calculateDurationMinutes(req.timestamp, req.assignmentTime || (isCompleted ? req.movementTime : null))
      const totalDur = isCompleted ? calculateDurationMinutes(req.timestamp, req.movementTime) : null

      return {
        'ID Único': req.requestId || 'TR-1000',
        'Registro': req.record || '',
        'Paciente': req.patient || '',
        'Prioridad': (req.priority || 'media').toUpperCase(),
        'Servicio Solicitante': req.service || '',
        'Ubicación Específica': req.location || '',
        'Destino': req.destination || '',
        'Camillero Asignado': req.mover || 'sin asignar',
        'Medio de Transporte': req.transport || '',
        'Soporte O2': req.oxygen || '',
        'Fecha y Hora Solicitud': req.timestamp || '',
        'Hora Asignado': req.assignmentTime || 'Pendiente',
        'Hora Realización': isCompleted ? (req.movementTime || '') : 'Pendiente',
        'Oportunidad de Servicio': isCompleted && serviceDur !== null ? formatDuration(serviceDur) : '—',
        'Oportunidad de Traslado': reactDur !== null ? formatDuration(reactDur) : '—',
        'Oportunidad Global': isCompleted && totalDur !== null ? formatDuration(totalDur) : '—',
        'Estado': isCompleted ? 'REALIZADO' : req.status || 'PENDIENTE',
        'Observación Solicitud': req.observation || '',
        'Observación Camilleros': req.centralObservation || '',
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(rows)
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 14 }, { wch: 26 }, { wch: 24 }, { wch: 22 },
      { wch: 22 }, { wch: 22 }, { wch: 18 }, { wch: 12 }, { wch: 24 },
      { wch: 24 }, { wch: 24 }, { wch: 24 }, { wch: 24 }, { wch: 20 },
      { wch: 15 }, { wch: 28 }, { wch: 28 }
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Traslados CNC')

    const dateStr = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(workbook, `Indicadores_Traslados_CNC_${dateStr}.xlsx`)
  }

  if (!isAuthenticated) {
    return (
      <section className="dashboard-page analytics-page auth-overlay-section" style={{ minHeight: '82vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="auth-card" style={{
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(16px)',
          borderRadius: '24px',
          padding: '44px 32px',
          maxWidth: '440px',
          width: '100%',
          boxShadow: '0 25px 60px rgba(48, 44, 107, 0.25), 0 0 0 1px rgba(48, 44, 107, 0.08)',
          textAlign: 'center',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <img src="/logooo-Photoroom.png" alt="Clínica Nueva de Cali" style={{ maxHeight: '72px', objectFit: 'contain' }} />
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#302c6b', margin: '0 0 8px' }}>
            Acceso a Indicadores
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
            Ingresa la contraseña para ver el contenido
          </p>

          <form onSubmit={handlePasswordSubmit}>
            <div style={{ marginBottom: '18px', textAlign: 'left' }}>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value)
                  if (passwordError) setPasswordError('')
                }}
                placeholder="Ingresa la contraseña..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  fontSize: '1.05rem',
                  borderRadius: '12px',
                  border: passwordError ? '2px solid #ef4444' : '2px solid #cbd5e1',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  background: '#f8fafc',
                  color: '#1e293b',
                  boxSizing: 'border-box'
                }}
              />
              {passwordError && (
                <div style={{ color: '#ef4444', fontSize: '0.86rem', fontWeight: 600, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚠️</span> {passwordError}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="submit-button"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '1rem',
                fontWeight: 700,
                borderRadius: '12px',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #302c6b, #00aaa9)',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 8px 20px rgba(48, 44, 107, 0.25)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
            >
              Ingresar al Tablero
            </button>
          </form>

          <div style={{ marginTop: '22px' }}>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('dashboard')}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '0.88rem',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '4px'
              }}
            >
              ← Volver a Central de Camilleros
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="dashboard-page analytics-page" aria-labelledby="analytics-title">
      <header className="dashboard-hero-banner">
        <div className="banner-text">
          <p className="eyebrow">INDICADORES Y TIEMPOS DE TRASLADO</p>
          <h1 id="analytics-title">Estadísticas de Traslados</h1>
          <p className="dashboard-subtitle">
            Monitoreo de tiempos de atención, reacción de camilleros y gestión de traslados.
          </p>
        </div>
        <div className="banner-right">
          <img className="banner-logo" src="/logooo-Photoroom.png" alt="Clínica Nueva de Cali" />
        </div>
      </header>

      {/* TOOLBAR UNIFICADO COMPACTO */}
      <div className="analytics-unified-toolbar">
        <div className="toolbar-actions-row">
          <div className="analytics-nav-buttons-group">
            <button type="button" className="analytics-link-btn" onClick={() => onNavigate && onNavigate('dashboard')}>
              Central de camilleros
            </button>
            <button type="button" className="analytics-link-btn" onClick={() => onNavigate && onNavigate('history')}>
              Historial de traslados
            </button>
            <button type="button" className="analytics-link-btn camilleros-manage-btn" onClick={() => setShowCamillerosModal(true)}>
              Gestión de Camilleros
            </button>
            <button type="button" className="analytics-link-btn excel-export-btn" onClick={handleExportExcel} title="Exportar solicitudes filtradas a Excel (.xlsx)">
              Exportar a Excel
            </button>
          </div>
        </div>

        <div className="toolbar-filters-grid">
          <label className="toolbar-search-box">
            <span aria-hidden="true">⌕</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar ID único, paciente, registro, destino..."
            />
          </label>

          <label className="compact-filter-item">
            <span>Estado</span>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              <option value="TODOS">Todos</option>
              <option value="REALIZADO">Realizados</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="NO REALIZADO">No realizados</option>
            </select>
          </label>

          <label className="compact-filter-item">
            <span>Mes</span>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              <option value="TODOS">Todos</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>

          <label className="compact-filter-item">
            <span>Año</span>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              <option value="TODOS">Todos</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>

          <label className="compact-filter-item">
            <span>Servicio</span>
            <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)}>
              <option value="TODOS">Todos</option>
              {availableServices.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label className="compact-filter-item">
            <span>Camillero</span>
            <select value={selectedMover} onChange={(e) => setSelectedMover(e.target.value)}>
              <option value="TODOS">Todos</option>
              {availableMovers.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>

          <label className="compact-filter-item">
            <span>Prioridad</span>
            <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)}>
              <option value="TODOS">Todos</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </label>

          <label className="compact-filter-item">
            <span>Transporte</span>
            <select value={selectedTransport} onChange={(e) => setSelectedTransport(e.target.value)}>
              <option value="TODOS">Todos</option>
              <option value="silla de ruedas">Silla de ruedas</option>
              <option value="cama">Cama</option>
              <option value="camilla ambulancia">Camilla ambulancia</option>
            </select>
          </label>

          <label className="compact-filter-item">
            <span>Soporte O2</span>
            <select value={selectedOxygen} onChange={(e) => setSelectedOxygen(e.target.value)}>
              <option value="TODOS">Todos</option>
              <option value="si">Con O2</option>
              <option value="no">Sin O2</option>
            </select>
          </label>

          <button
            type="button"
            className={`refresh-btn ${refreshState}`}
            onClick={triggerRefresh}
            title="Actualizar datos"
          >
            <span className="refresh-icon" aria-hidden="true">↻</span>
            <span>{refreshState === 'refreshing' ? 'Actualizando...' : refreshState === 'success' ? '¡Listo!' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      {/* TARJETAS DE RESUMEN KPI (7 TARJETAS CON ICONOS Y ESTADOS) */}
      <div className="summary-section-wrap">
        <h3 className="section-subtitle-heading">Tarjetas de Resumen</h3>
        <div className="summary-cards-grid">
          <div className="summary-gradient-card card-indigo">
            <div className="summary-card-content">
              <span className="summary-card-title">Promedio Oportunidad de Servicio:</span>
              <strong className="summary-card-metric">{formatDuration(totalServiceMinutes)}</strong>
            </div>
            <img className="summary-card-img-icon" src="/cronometro.png" alt="Oportunidad de Servicio" />
          </div>

          <div className="summary-gradient-card card-blue">
            <div className="summary-card-content">
              <span className="summary-card-title">Promedio Oportunidad de Traslado:</span>
              <strong className="summary-card-metric">{formatDuration(totalReactionMinutes)}</strong>
            </div>
            <img className="summary-card-img-icon" src="/reloj.png" alt="Oportunidad de Traslado" />
          </div>

          <div className="summary-gradient-card card-cyan">
            <div className="summary-card-content">
              <span className="summary-card-title">Promedio Oportunidad Global:</span>
              <strong className="summary-card-metric">{formatDuration(totalDurationMinutes)}</strong>
            </div>
            <img className="summary-card-img-icon" src="/cronometro.png" alt="Oportunidad Global" />
          </div>

          <div className="summary-gradient-card card-teal">
            <div className="summary-card-content">
              <span className="summary-card-title">Traslados Realizados:</span>
              <strong className="summary-card-metric">{totalCompleted}</strong>
            </div>
            <img className="summary-card-img-icon" src="/camilla-medica.png" alt="Traslados Realizados" />
          </div>

          <div className="summary-gradient-card card-amber">
            <div className="summary-card-content">
              <span className="summary-card-title">Traslados Pendientes:</span>
              <strong className="summary-card-metric">{totalPending}</strong>
            </div>
            <img className="summary-card-img-icon" src="/camilla-medica.png" alt="Traslados Pendientes" />
          </div>

          <div className="summary-gradient-card card-rose">
            <div className="summary-card-content">
              <span className="summary-card-title">Traslados No Realizados:</span>
              <strong className="summary-card-metric">{totalNotRealized}</strong>
            </div>
            <img className="summary-card-img-icon" src="/camilla-medica.png" alt="Traslados No Realizados" />
          </div>

          <div className="summary-gradient-card card-emerald">
            <div className="summary-card-content">
              <span className="summary-card-title">Camilleros Activos:</span>
              <strong className="summary-card-metric">{(camilleros || []).length}</strong>
            </div>
            <img className="summary-card-img-icon" src="/paramedico.png" alt="Camilleros Activos" />
          </div>
        </div>
      </div>

      {/* FILA 1 DE GRÁFICOS: SERVICIOS Y CAMILLEROS */}
      <div className="charts-four-grid">
        {/* GRÁFICO 1 (TOP-LEFT): OPORTUNIDAD GLOBAL POR SERVICIO */}
        <div className="stat-card-container productivity-card-container">
          <h4 className="stat-card-heading">Oportunidad Global por Servicio</h4>
          <div className="productivity-list">
            {serviceStats.map((item, idx) => (
              <div
                className="stat-bar-item productivity-item"
                key={item.name}
                title={`Servicio: ${item.name}\n• Promedio Oportunidad Global: ${item.avgGlobal} min\n• Promedio Oportunidad de Servicio (Realización): ${item.avgService} min\n• Promedio Oportunidad de Traslado (Toma en Central): ${item.avgReact} min\n• Solicitudes: ${item.count} (${item.pct}%)`}
              >
                <div className="stat-bar-label-row">
                  <span className="stat-item-name">
                    <strong>#{idx + 1}</strong> {item.name}
                  </span>
                  <span className="stat-item-count">
                    {item.count} traslados ({item.pct}%) {item.avgGlobal > 0 ? `· ${item.avgGlobal} min prom` : ''}
                  </span>
                </div>
                <div className="stat-bar-track">
                  <div
                    className="stat-bar-fill-gradient fill-cyan"
                    style={{ width: `${Math.max(Number(item.pct), item.count > 0 ? 10 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
            {!serviceStats.length && (
              <div className="empty-state-mini">No hay traslados en los servicios con estos filtros.</div>
            )}
          </div>
        </div>

        {/* GRÁFICO 2 (TOP-RIGHT): PRODUCTIVIDAD DE CAMILLEROS */}
        <div className="stat-card-container productivity-card-container">
          <h4 className="stat-card-heading">Productividad de Camilleros</h4>
          <div className="productivity-list">
            {camilleroStats.map((item, idx) => (
              <div
                className="stat-bar-item productivity-item"
                key={item.name}
                title={`Camillero: ${item.name}\n• Promedio en tomar/coger traslado desde Central: ${item.avgReact} min\n• Promedio en realizar traslado (Servicio): ${item.avgService} min\n• Promedio Global: ${item.avgGlobal} min\n• Traslados Realizados: ${item.count} (${item.pct}%)`}
              >
                <div className="stat-bar-label-row">
                  <span className="stat-item-name">
                    <strong>#{idx + 1}</strong> {item.name}
                  </span>
                  <span className="stat-item-count">
                    {item.count} traslados ({item.pct}%) {item.avgService > 0 ? `· ${item.avgService} min prom` : ''}
                  </span>
                </div>
                <div className="stat-bar-track">
                  <div
                    className="stat-bar-fill-gradient fill-purple"
                    style={{ width: `${Math.max(Number(item.pct), item.count > 0 ? 10 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
            {!camilleroStats.length && (
              <div className="empty-state-mini">No hay datos de camilleros registrados.</div>
            )}
          </div>
        </div>
      </div>

      {/* FILA 2 DE GRÁFICOS (3 COLUMNAS): PRIORIDAD, SOPORTE O2 Y TRANSPORTE */}
      <div className="charts-three-columns-grid">
        {/* GRÁFICO 3: PRIORIDAD DEL TRASLADO */}
        <div className="stat-card-container">
          <h4 className="stat-card-heading">Prioridad del Traslado</h4>
          <div
            className="stat-bar-item productivity-item"
            title={`Prioridad ALTA\n• Promedio realización: ${priorityStats.alta.avgService} min\n• Promedio toma en central: ${priorityStats.alta.avgReact} min\n• Promedio Global: ${priorityStats.alta.avgGlobal} min\n• Traslados: ${priorityStats.alta.count} (${priorityStats.alta.pct}%)`}
          >
            <div className="stat-bar-label-row">
              <span className="stat-item-name" style={{ color: '#dc2626' }}>● ALTA</span>
              <span className="stat-item-count">
                {priorityStats.alta.count} traslados ({priorityStats.alta.pct}%) {priorityStats.alta.avgGlobal > 0 ? `· ${priorityStats.alta.avgGlobal} min` : ''}
              </span>
            </div>
            <div className="stat-bar-track">
              <div className="stat-bar-fill-gradient fill-red" style={{ width: `${priorityStats.alta.pct}%` }} />
            </div>
          </div>

          <div
            className="stat-bar-item productivity-item"
            title={`Prioridad MEDIA\n• Promedio realización: ${priorityStats.media.avgService} min\n• Promedio toma en central: ${priorityStats.media.avgReact} min\n• Promedio Global: ${priorityStats.media.avgGlobal} min\n• Traslados: ${priorityStats.media.count} (${priorityStats.media.pct}%)`}
          >
            <div className="stat-bar-label-row">
              <span className="stat-item-name" style={{ color: '#d97706' }}>● MEDIA</span>
              <span className="stat-item-count">
                {priorityStats.media.count} traslados ({priorityStats.media.pct}%) {priorityStats.media.avgGlobal > 0 ? `· ${priorityStats.media.avgGlobal} min` : ''}
              </span>
            </div>
            <div className="stat-bar-track">
              <div className="stat-bar-fill-gradient fill-orange" style={{ width: `${priorityStats.media.pct}%` }} />
            </div>
          </div>

          <div
            className="stat-bar-item productivity-item"
            title={`Prioridad BAJA\n• Promedio realización: ${priorityStats.baja.avgService} min\n• Promedio toma en central: ${priorityStats.baja.avgReact} min\n• Promedio Global: ${priorityStats.baja.avgGlobal} min\n• Traslados: ${priorityStats.baja.count} (${priorityStats.baja.pct}%)`}
          >
            <div className="stat-bar-label-row">
              <span className="stat-item-name" style={{ color: '#059669' }}>● BAJA</span>
              <span className="stat-item-count">
                {priorityStats.baja.count} traslados ({priorityStats.baja.pct}%) {priorityStats.baja.avgGlobal > 0 ? `· ${priorityStats.baja.avgGlobal} min` : ''}
              </span>
            </div>
            <div className="stat-bar-track">
              <div className="stat-bar-fill-gradient fill-green" style={{ width: `${priorityStats.baja.pct}%` }} />
            </div>
          </div>
        </div>

        {/* GRÁFICO 4: SOPORTE DE O2 */}
        <div className="stat-card-container">
          <h4 className="stat-card-heading">Soporte de O2</h4>
          <div
            className="stat-bar-item productivity-item"
            title={`Con Soporte de O2\n• Traslados: ${o2Stats.withO2.count} (${o2Stats.withO2.pct}%)`}
          >
            <div className="stat-bar-label-row">
              <span className="stat-item-name">Con Soporte de O2</span>
              <span className="stat-item-count">{o2Stats.withO2.count} traslados ({o2Stats.withO2.pct}%)</span>
            </div>
            <div className="stat-bar-track">
              <div className="stat-bar-fill-gradient fill-teal" style={{ width: `${o2Stats.withO2.pct}%` }} />
            </div>
          </div>

          <div
            className="stat-bar-item productivity-item"
            title={`Sin Soporte de O2\n• Traslados: ${o2Stats.withoutO2.count} (${o2Stats.withoutO2.pct}%)`}
          >
            <div className="stat-bar-label-row">
              <span className="stat-item-name">Sin Soporte de O2</span>
              <span className="stat-item-count">{o2Stats.withoutO2.count} traslados ({o2Stats.withoutO2.pct}%)</span>
            </div>
            <div className="stat-bar-track">
              <div className="stat-bar-fill-gradient fill-navy" style={{ width: `${o2Stats.withoutO2.pct}%` }} />
            </div>
          </div>
        </div>

        {/* GRÁFICO 5: MEDIO DE TRANSPORTE */}
        <div className="stat-card-container">
          <h4 className="stat-card-heading">Medio de Transporte</h4>
          <div
            className="stat-bar-item productivity-item"
            title={`Silla de Ruedas\n• Promedio entre toma y realización (Servicio): ${transportStats.wheelchair.avgService} min\n• Promedio toma en central (Traslado): ${transportStats.wheelchair.avgReact} min\n• Promedio Global: ${transportStats.wheelchair.avgGlobal} min\n• Traslados: ${transportStats.wheelchair.count} (${transportStats.wheelchair.pct}%)`}
          >
            <div className="stat-bar-label-row">
              <span className="stat-item-name">Silla de Ruedas</span>
              <span className="stat-item-count">
                {transportStats.wheelchair.count} traslados ({transportStats.wheelchair.pct}%) {transportStats.wheelchair.avgService > 0 ? `· ${transportStats.wheelchair.avgService} min prom` : ''}
              </span>
            </div>
            <div className="stat-bar-track">
              <div className="stat-bar-fill-gradient fill-navy" style={{ width: `${transportStats.wheelchair.pct}%` }} />
            </div>
          </div>

          <div
            className="stat-bar-item productivity-item"
            title={`Cama\n• Promedio entre toma y realización (Servicio): ${transportStats.bed.avgService} min\n• Promedio toma en central (Traslado): ${transportStats.bed.avgReact} min\n• Promedio Global: ${transportStats.bed.avgGlobal} min\n• Traslados: ${transportStats.bed.count} (${transportStats.bed.pct}%)`}
          >
            <div className="stat-bar-label-row">
              <span className="stat-item-name">Cama</span>
              <span className="stat-item-count">
                {transportStats.bed.count} traslados ({transportStats.bed.pct}%) {transportStats.bed.avgService > 0 ? `· ${transportStats.bed.avgService} min prom` : ''}
              </span>
            </div>
            <div className="stat-bar-track">
              <div className="stat-bar-fill-gradient fill-teal" style={{ width: `${transportStats.bed.pct}%` }} />
            </div>
          </div>

          <div
            className="stat-bar-item productivity-item"
            title={`Camilla Ambulancia\n• Promedio entre toma y realización (Servicio): ${transportStats.ambulance.avgService} min\n• Promedio toma en central (Traslado): ${transportStats.ambulance.avgReact} min\n• Promedio Global: ${transportStats.ambulance.avgGlobal} min\n• Traslados: ${transportStats.ambulance.count} (${transportStats.ambulance.pct}%)`}
          >
            <div className="stat-bar-label-row">
              <span className="stat-item-name">Camilla Ambulancia</span>
              <span className="stat-item-count">
                {transportStats.ambulance.count} traslados ({transportStats.ambulance.pct}%) {transportStats.ambulance.avgService > 0 ? `· ${transportStats.ambulance.avgService} min prom` : ''}
              </span>
            </div>
            <div className="stat-bar-track">
              <div className="stat-bar-fill-gradient fill-cyan" style={{ width: `${transportStats.ambulance.pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="table-card corporate-table-card">
        <div className="table-caption corporate-table-caption">
          <div>
            <strong className="table-main-title">Solicitudes Individuales de Traslado</strong>
          </div>
          <button
            type="button"
            className="excel-table-btn"
            onClick={handleExportExcel}
            title="Descargar esta lista en archivo Excel"
          >
            Exportar a Excel ({filteredRequests.length})
          </button>
        </div>
        <div className="mobile-scroll-hint">
          <span>↔</span> Desliza la tabla horizontalmente para ver todos los campos
        </div>
        <div className="table-scroll">
          <table className="compact-movement-table modern-navy-table">
            <thead>
              <tr>
                <th>ID Único</th>
                <th>Registro</th>
                <th>Paciente</th>
                <th>Prioridad</th>
                <th>Servicio</th>
                <th>Ubicacion especifica</th>
                <th>Destino</th>
                <th>Transporte</th>
                <th>Soporte O2</th>
                <th>Camillero</th>
                <th>Hora Solicitud</th>
                <th>Hora Asignado</th>
                <th>Hora Realizacion</th>
                <th>Oportunidad de Servicio</th>
                <th>Oportunidad de Traslado</th>
                <th>Oportunidad Global</th>
                <th>Estado</th>
                <th>Observacion solicitud</th>
                <th>Observacion camilleros</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRequests.map((req) => {
                const isCompleted = req.status === 'REALIZADO'
                const serviceDur = isCompleted ? calculateDurationMinutes(req.assignmentTime || req.timestamp, req.movementTime) : null
                const reactDur = calculateDurationMinutes(req.timestamp, req.assignmentTime || (isCompleted ? req.movementTime : null))
                const totalDur = isCompleted ? calculateDurationMinutes(req.timestamp, req.movementTime) : null
                return (
                  <tr key={req.id}>
                    <td><strong className="table-id-text">{req.requestId || 'TR-1000'}</strong></td>
                    <td><strong>{req.record}</strong></td>
                    <td className="patient-name-cell">{req.patient}</td>
                    <td>
                      <span className={`priority-badge priority-${(req.priority || 'media').toLowerCase()}`}>
                        {(req.priority || 'media').toUpperCase()}
                      </span>
                    </td>
                    <td className="service-name-cell">{req.service}</td>
                    <td>{req.location}</td>
                    <td>{req.destination}</td>
                    <td>{req.transport}</td>
                    <td>{req.oxygen}</td>
                    <td>{req.mover}</td>
                    <td>{req.timestamp}</td>
                    <td>{req.assignmentTime || 'Pendiente'}</td>
                    <td>{isCompleted ? req.movementTime : 'Pendiente'}</td>
                    <td>
                      <span className={`badge-pill ${isCompleted && serviceDur !== null ? 'pill-blue' : 'pill-gray'}`}>
                        {isCompleted && serviceDur !== null ? formatDuration(serviceDur) : '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-pill ${reactDur !== null ? 'pill-purple' : 'pill-gray'}`}>
                        {reactDur !== null ? formatDuration(reactDur) : '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-pill ${isCompleted && totalDur !== null ? 'pill-amber' : 'pill-gray'}`}>
                        {isCompleted && totalDur !== null ? formatDuration(totalDur) : '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-pill ${isCompleted ? 'pill-green' : 'pill-orange'}`}>
                        {isCompleted ? 'Completado' : req.status === 'PENDIENTE' ? 'Pendiente' : req.status}
                      </span>
                    </td>
                    <td>{req.observation || '—'}</td>
                    <td>{req.centralObservation || '—'}</td>
                  </tr>
                )
              })}
              {!filteredRequests.length && (
                <tr>
                  <td colSpan={19} className="empty-state">No hay traslados con estos filtros.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={currentPage}
          totalItems={filteredRequests.length}
          pageSize={10}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* MODAL DE GESTIÓN DEL PERSONAL DE CAMILLEROS */}
      {showCamillerosModal && (
        <div className="modal-overlay" onClick={() => setShowCamillerosModal(false)}>
          <div className="modal-card edit-modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2>Gestión del Personal de Camilleros</h2>
              <button type="button" className="close-modal-btn" onClick={() => setShowCamillerosModal(false)}>✕</button>
            </header>
            <div className="personnel-modal-body">
              <p className="personnel-modal-desc">
                Agrega o elimina nombres del equipo de camilleros. Los nombres registrados aparecerán en los selectores de asignación.
              </p>
              <form onSubmit={handleAddCamillero} className="personnel-form">
                <input
                  type="text"
                  className="personnel-input"
                  value={newCamilleroName}
                  onChange={(e) => setNewCamilleroName(e.target.value)}
                  placeholder="Nombre y apellido del camillero..."
                />
                <button type="submit" className="personnel-btn">
                  + AGREGAR CAMILLERO
                </button>
              </form>
              <div className="personnel-tags-grid">
                {(camilleros || []).map((name) => (
                  <div className="personnel-tag-pill" key={name}>
                    <span>{name}</span>
                    <button
                      type="button"
                      className="personnel-tag-close"
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        handleRemoveCamillero(name)
                      }}
                      title={`Eliminar a ${name}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <footer className="modal-footer">
              <button className="submit-button" type="button" onClick={() => setShowCamillerosModal(false)}>
                Cerrar
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  )
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
