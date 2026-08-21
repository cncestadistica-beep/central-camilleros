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
}

const demoRequests = [
  { id: 'demo-1', requestId: 'TR-1001', timestamp: '19/8/2026, 9:20:36 a. m.', assignmentTime: '19/8/2026, 9:25:00 a. m.', movementTime: '19/8/2026, 9:38:02 a. m.', patient: 'Maria Gonzales', record: '3425872', location: 'sala de espera', destination: 'cubículo 26', oxygen: 'si', transport: 'silla de ruedas', observation: '', service: 'idime', status: 'REALIZADO', mover: 'juan', centralObservation: '' },
  { id: 'demo-2', requestId: 'TR-1002', timestamp: '19/8/2026, 9:15:48 a. m.', assignmentTime: '19/8/2026, 9:30:00 a. m.', movementTime: '19/8/2026, 10:10:33 a. m.', patient: 'Michi Orlando Bafio', record: '3425871', location: 'sala de espera', destination: 'gineco', oxygen: 'no', transport: 'silla de ruedas', observation: '', service: 'urgencias adultos', status: 'REALIZADO', mover: 'pablo', centralObservation: '' },
  { id: 'demo-3', requestId: 'TR-1003', timestamp: '16/02/2026 3:08:57', assignmentTime: '16/02/2026 3:09:15', movementTime: '16/02/2026 3:10:43', patient: 'Angie Grisales', record: '3425850', location: 'sala de espera', destination: 'gineco', oxygen: 'no', transport: 'silla de ruedas', observation: '', service: 'urgencias adultos', status: 'REALIZADO', mover: 'victor perafán', centralObservation: '' },
  { id: 'demo-4', requestId: 'TR-1004', timestamp: '16/02/2026 3:43:58', assignmentTime: '16/02/2026 4:00:00', movementTime: '16/02/2026 4:30:29', patient: 'Yesin Gratales', record: '3425870', location: 'sala de espera', destination: 'ginecoobstetricia', oxygen: 'no', transport: 'silla de ruedas', observation: '', service: 'urgencias adultos', status: 'REALIZADO', mover: 'gestora', centralObservation: '' },
  { id: 'demo-5', requestId: 'TR-1005', timestamp: '16/02/2026 4:53:26', assignmentTime: '16/02/2026 5:05:00', movementTime: '16/02/2026 5:27:55', patient: 'Eimer Lasso Santacr', record: '3423499', location: 'alf del cuarto de diam', destination: 'cirugia', oxygen: 'no', transport: 'silla de ruedas', observation: 'debe estar en cirugia', service: 'urgencias adultos', status: 'REALIZADO', mover: 'victor perafán', centralObservation: '' },
  { id: 'demo-6', requestId: 'TR-1006', timestamp: '16/02/2026 6:06:01', assignmentTime: '16/02/2026 6:15:00', movementTime: '16/02/2026 6:41:09', patient: 'Gabriel Henao', record: '341889', location: 'urgencias sala de procedimientos', destination: 'diálisis', oxygen: 'no', transport: 'silla de ruedas', observation: '', service: 'hospitalización 6to piso', status: 'REALIZADO', mover: 'andrés castro', centralObservation: '' },
  { id: 'demo-7', requestId: 'TR-1007', timestamp: '20/8/2026, 8:10:00 a. m.', assignmentTime: null, movementTime: 'pendiente', patient: 'Miguel', record: '3425880', location: 'su casa', destination: 'rayos x', oxygen: 'no', transport: 'silla de ruedas', observation: '', service: 'urgencias adultos', status: 'PENDIENTE', mover: 'sin asignar', centralObservation: '' },
  { id: 'demo-8', requestId: 'TR-1008', timestamp: '20/8/2026, 8:15:00 a. m.', assignmentTime: null, movementTime: 'pendiente', patient: 'Jfjgg', record: '3425881', location: 'grggrg', destination: 'dgrdgd', oxygen: 'no', transport: 'silla de ruedas', observation: '', service: 'urgencias adultos', status: 'PENDIENTE', mover: 'sin asignar', centralObservation: '' },
  { id: 'demo-9', requestId: 'TR-1009', timestamp: '20/8/2026, 8:20:00 a. m.', assignmentTime: null, movementTime: 'pendiente', patient: 'Juan', record: '3425882', location: 'tjgjj', destination: 'trthrthrth', oxygen: 'no', transport: 'silla de ruedas', observation: '', service: 'urgencias adultos', status: 'PENDIENTE', mover: 'sin asignar', centralObservation: '' },
  { id: 'demo-10', requestId: 'TR-1010', timestamp: '20/8/2026, 8:25:00 a. m.', assignmentTime: null, movementTime: 'pendiente', patient: 'Florencia Jiménez', record: '3425883', location: 'imágenes', destination: 'cub 26', oxygen: 'no', transport: 'silla de ruedas', observation: '', service: 'urgencias adultos', status: 'NO REALIZADO', mover: 'sin asignar', centralObservation: 'Paciente no se encontraba en sala' },
  { id: 'demo-11', requestId: 'TR-1011', timestamp: '20/8/2026, 8:30:00 a. m.', assignmentTime: null, movementTime: 'pendiente', patient: 'Jhon Herrera', record: '3425884', location: 'sala de espera', destination: 'rx', oxygen: 'no', transport: 'silla de ruedas', observation: '', service: 'urgencias adultos', status: 'PENDIENTE', mover: 'sin asignar', centralObservation: '' },
]

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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(demoRequests))
      return demoRequests
    }
    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed) || !parsed.length) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(demoRequests))
      return demoRequests
    }

    let list = parsed
    const hasActive = parsed.some((r) => String(r.status || '').toUpperCase() !== 'REALIZADO')
    if (!hasActive) {
      const demoActive = demoRequests.filter((r) => String(r.status || '').toUpperCase() !== 'REALIZADO')
      list = [...demoActive, ...parsed]
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    }

    return list.map((item, idx) => ({
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
    return demoRequests
  }
}

function readCamilleros() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY_CAMILLEROS)
    if (!saved) {
      window.localStorage.setItem(STORAGE_KEY_CAMILLEROS, JSON.stringify(defaultCamilleros))
      return defaultCamilleros
    }
    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) && parsed.length ? parsed : defaultCamilleros
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

const fetchApiRequests = async () => {
  try {
    const res = await fetch('/api/solicitudes')
    if (!res.ok) return null
    const json = await res.json()
    if (json && Array.isArray(json.data) && json.data.length > 0) {
      const mapped = json.data.map((item, idx) => ({
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
      }))
      persistRequests(mapped)
      return mapped
    }
  } catch (err) {
    // fallback to local storage
  }
  return null
}

const saveApiRequest = async (request) => {
  try {
    await fetch('/api/solicitudes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
  } catch (err) {
    console.error('Error guardando en PostgreSQL API:', err)
  }
}

const fetchApiCamilleros = async () => {
  try {
    const res = await fetch('/api/camilleros')
    if (!res.ok) return null
    const json = await res.json()
    if (json && Array.isArray(json.data) && json.data.length > 0) {
      window.localStorage.setItem(STORAGE_KEY_CAMILLEROS, JSON.stringify(json.data))
      return json.data
    }
  } catch (err) {
    // fallback
  }
  return null
}

const saveApiCamillero = async (name, action = 'POST') => {
  try {
    await fetch('/api/camilleros', {
      method: action,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
  } catch (err) {
    console.error('Error actualizando camillero en API:', err)
  }
}

function App() {
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
      const apiReqs = await fetchApiRequests()
      if (mounted && apiReqs) setRequests(apiReqs)
      const apiCams = await fetchApiCamilleros()
      if (mounted && apiCams) setCamilleros(apiCams)
    }

    doSync()

    const interval = setInterval(async () => {
      const apiReqs = await fetchApiRequests()
      if (mounted && apiReqs) {
        setRequests(apiReqs)
      } else if (mounted) {
        setRequests(readRequests())
      }
      const apiCams = await fetchApiCamilleros()
      if (mounted && apiCams) {
        setCamilleros(apiCams)
      } else if (mounted) {
        setCamilleros(readCamilleros())
      }
    }, 1500)

    const onPopState = () => {
      setRequests(readRequests())
      setCamilleros(readCamilleros())
      setPage(getPageFromPath())
    }
    const onFocus = () => {
      doSync()
    }
    window.addEventListener('popstate', onPopState)
    window.addEventListener('focus', onFocus)
    return () => {
      mounted = false
      clearInterval(interval)
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('focus', onFocus)
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

  const handleUpdateCamilleros = (nextCamilleros, addedName, removedName) => {
    setCamilleros(nextCamilleros)
    window.localStorage.setItem(STORAGE_KEY_CAMILLEROS, JSON.stringify(nextCamilleros))
    if (addedName) saveApiCamillero(addedName, 'POST')
    if (removedName) saveApiCamillero(removedName, 'DELETE')
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

    if (String(editDraft.status || '').toUpperCase() === 'NO REALIZADO') {
      if (!editDraft.centralObservation || !editDraft.centralObservation.trim()) {
        setEditError('Es obligatorio ingresar la observación o motivo por el cual no se realizó el traslado.')
        return
      }
    }
    setEditError('')

    let updatedMovementTime = editRequest.movementTime || 'Pendiente'
    let updatedAssignmentTime = editRequest.assignmentTime || null

    if (editDraft.mover && editDraft.mover !== 'sin asignar' && !updatedAssignmentTime) {
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
          mover: editDraft.mover || 'sin asignar',
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
        <div><span>Total activas</span><strong>{activeRequests.length}</strong></div>
        <div className="pending-stat"><span>Pendientes</span><strong>{pendingCount}</strong></div>
        <div><span>No realizados</span><strong>{notRealizedCount}</strong></div>
      </div>
      <div className="dashboard-toolbar">
        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar paciente, registro u observación" />
        </label>
        <label className="filter-select">
          <span>Servicio</span>
          <select value={service} onChange={(e) => setService(e.target.value)}>
            <option value="TODOS">Todos</option>
            {services.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <div className="status-tabs">
          {[
            ['TODAS', 'Todas'],
            ['PENDIENTE', 'Pendientes'],
            ['NO REALIZADO', 'No realizados'],
          ].map(([val, label]) => (
            <button
              type="button"
              className={filter === val ? 'active' : ''}
              key={val}
              onClick={() => setFilter(val)}
            >
              {label}
            </button>
          ))}
        </div>
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
                  <td colSpan={5} className="empty-state">No hay traslados activos con estos filtros.</td>
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
                <label className="edit-field-label">Camillero que realiza</label>
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
                    className="edit-modal-select"
                    value={editDraft.mover}
                    onChange={(e) => setEditDraft({ ...editDraft, mover: e.target.value })}
                  >
                    <option value="">sin asignar</option>
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

function HistoryPage({ requests, onRefresh, onNavigate }) {
  const [query, setQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('TODOS')
  const [selectedMonth, setSelectedMonth] = useState('TODOS')
  const [selectedYear, setSelectedYear] = useState('TODOS')
  const [selectedService, setSelectedService] = useState('TODOS')
  const [selectedMover, setSelectedMover] = useState('TODOS')
  const [selectedTransport, setSelectedTransport] = useState('TODOS')
  const [selectedOxygen, setSelectedOxygen] = useState('TODOS')
  const [refreshState, setRefreshState] = useState('idle')
  const [detailRequest, setDetailRequest] = useState(null)

  useEffect(() => {
    if (onRefresh) onRefresh()
    const autoRefreshTimer = setInterval(() => {
      if (onRefresh) onRefresh()
    }, 60000)
    return () => clearInterval(autoRefreshTimer)
  }, [onRefresh])

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
      if (selectedTransport !== 'TODOS' && (req.transport || '').toLowerCase() !== selectedTransport.toLowerCase()) return false
      if (selectedOxygen !== 'TODOS' && (req.oxygen || '').toLowerCase() !== selectedOxygen.toLowerCase()) return false

      if (query.trim()) {
        const q = query.toLowerCase().trim()
        const haystack = `${req.requestId || ''} ${req.patient || ''} ${req.record || ''} ${req.location || ''} ${req.destination || ''} ${req.service || ''} ${req.mover || ''} ${req.observation || ''} ${req.centralObservation || ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }

      return true
    })
  }, [historyRequests, query, selectedStatus, selectedMonth, selectedYear, selectedService, selectedMover, selectedTransport, selectedOxygen])

  const totalCount = filteredRequests.length
  const completedCount = filteredRequests.filter((r) => String(r.status || '').toUpperCase() === 'REALIZADO').length
  const notRealizedCount = filteredRequests.filter((r) => String(r.status || '').toUpperCase() === 'NO REALIZADO').length

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
              {filteredRequests.map((req) => {
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
                  <td colSpan={19} className="empty-state">No se encontraron traslados con los filtros seleccionados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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

function AnalyticsPage({ requests: initialRequests, camilleros: initialCamilleros, onUpdateCamilleros, onRefresh, onNavigate }) {
  const [requests, setRequests] = useState(initialRequests || readRequests)
  const [camilleros, setCamilleros] = useState(initialCamilleros || readCamilleros)
  const [query, setQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('TODOS')
  const [selectedMonth, setSelectedMonth] = useState('TODOS')
  const [selectedYear, setSelectedYear] = useState('TODOS')
  const [selectedService, setSelectedService] = useState('TODOS')
  const [selectedMover, setSelectedMover] = useState('TODOS')
  const [selectedOxygen, setSelectedOxygen] = useState('TODOS')
  const [selectedTransport, setSelectedTransport] = useState('TODOS')
  const [newCamilleroName, setNewCamilleroName] = useState('')
  const [showCamillerosModal, setShowCamillerosModal] = useState(false)
  const [refreshState, setRefreshState] = useState('idle')

  useEffect(() => {
    if (initialRequests) setRequests(initialRequests)
  }, [initialRequests])

  useEffect(() => {
    if (initialCamilleros) setCamilleros(initialCamilleros)
  }, [initialCamilleros])

  useEffect(() => {
    const liveTimer = setInterval(() => {
      const freshReqs = readRequests()
      const freshCams = readCamilleros()
      setRequests(freshReqs)
      setCamilleros(freshCams)
      if (onRefresh) onRefresh()
    }, 1000)
    return () => clearInterval(liveTimer)
  }, [])

  const handleAddCamillero = (e) => {
    e.preventDefault()
    const cleanName = formatLowercase(newCamilleroName.trim())
    if (cleanName && !camilleros.includes(cleanName)) {
      const next = [...camilleros, cleanName]
      setCamilleros(next)
      onUpdateCamilleros(next)
      setNewCamilleroName('')
    }
  }

  const handleRemoveCamillero = (nameToRemove) => {
    const next = camilleros.filter((c) => c !== nameToRemove)
    setCamilleros(next)
    onUpdateCamilleros(next)
  }

  const triggerRefresh = () => {
    setRefreshState('refreshing')
    const freshReqs = readRequests()
    const freshCams = readCamilleros()
    setRequests(freshReqs)
    setCamilleros(freshCams)
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
        if (!idMatch && !patientMatch && !recordMatch && !destMatch && !obsMatch && !centralObsMatch && !moverMatch) {
          return false
        }
      }

      return true
    })
  }, [requests, selectedMonth, selectedYear, selectedStatus, selectedService, selectedMover, selectedOxygen, selectedTransport, query])

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

      {/* CUADRÍCULA 2x2 DE GRÁFICOS (OPORTUNIDAD POR SERVICIO ARRIBA A LA IZQUIERDA DE PRIMERO) */}
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

        {/* GRÁFICO 3 (BOTTOM-LEFT): SOPORTE DE O2 */}
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

        {/* GRÁFICO 4 (BOTTOM-RIGHT): MEDIO DE TRANSPORTE */}
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
              {filteredRequests.map((req) => {
                const isCompleted = req.status === 'REALIZADO'
                const serviceDur = isCompleted ? calculateDurationMinutes(req.assignmentTime || req.timestamp, req.movementTime) : null
                const reactDur = calculateDurationMinutes(req.timestamp, req.assignmentTime || (isCompleted ? req.movementTime : null))
                const totalDur = isCompleted ? calculateDurationMinutes(req.timestamp, req.movementTime) : null
                return (
                  <tr key={req.id}>
                    <td><strong className="table-id-text">{req.requestId || 'TR-1000'}</strong></td>
                    <td><strong>{req.record}</strong></td>
                    <td className="patient-name-cell">{req.patient}</td>
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
                  <td colSpan={18} className="empty-state">No hay traslados con estos filtros.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
                      onClick={() => handleRemoveCamillero(name)}
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
