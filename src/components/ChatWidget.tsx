import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react'
import {
  CHAT_COPY,
  CONTACT_EMAIL,
  FORM_FIELDS,
  SUPPORT_SCRIPT,
  SUPPORT_SCRIPT_LOW_BUDGET,
} from '../data/chatConfig'
import { STICKY_CTA } from '../data/copy'
import {
  createLead,
  flushOutbox,
  getThread,
  outbox,
  postMessage,
  queueFailedLead,
} from '../api/index'
import { ErrorBoundary } from './ErrorBoundary'
import { isBrowser } from '../lib/dom'
import { clearStoredRequest, readStoredRequest, writeStoredRequest } from '../api/storage'
import type { AuthorKind, ChatMessage, LeadFields, ThreadMessage } from '../api/types'
import './ChatWidget.css'

/**
 * Front-end only support chat. A short qualifying form creates a request,
 * then the deal is discussed in a thread.
 *
 * Two honesty rules are load-bearing here:
 *
 * 1. The scripted replies never pose as a person. The header carries the
 *    automated disclosure from first paint and every support bubble is
 *    labelled. A timer pretending to be staff would be the one genuinely
 *    dishonest thing this widget could do.
 * 2. There is no backend, so a submitted request only ever reaches the studio
 *    if the visitor sends the email. That route is always visible — otherwise
 *    the widget is a lead black hole that looks like a contact form.
 */

const TICKET_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

type ChatView = 'form' | 'chat'

/**
 * What actually happened to the submission.
 * 'local' means no backend is configured — a supported mode, not a failure.
 */
type Delivery = 'idle' | 'sent' | 'local' | 'failed'

export interface ChatContextValue {
  open: () => void
  hasRequest: boolean
}

const ChatContext = createContext<ChatContextValue>({
  open: () => {},
  hasRequest: false,
})

export function useChat(): ChatContextValue {
  return useContext(ChatContext)
}

/** Human-readable reference: no 0/O/1/I, so it can be read out over the phone. */
function makeTicketId(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${pad(now.getFullYear() % 100)}${pad(now.getMonth() + 1)}${pad(
    now.getDate()
  )}`

  const size = 4
  let suffix = ''
  if (window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(size)
    window.crypto.getRandomValues(bytes)
    for (const byte of bytes) {
      suffix += TICKET_ALPHABET[byte % TICKET_ALPHABET.length] ?? 'X'
    }
  } else {
    for (let i = 0; i < size; i += 1) {
      suffix += TICKET_ALPHABET[Math.floor(Math.random() * TICKET_ALPHABET.length)] ?? 'X'
    }
  }

  return `NYC-${stamp}-${suffix}`
}

function newClientId(): string {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Server copies win over optimistic ones, matched on clientId. Without this a
 * reopened thread shows every visitor message twice: once as the local bubble
 * and once as whatever the server stored.
 */
function mergeThreads(local: ThreadMessage[], remote: ChatMessage[]): ThreadMessage[] {
  const result: ThreadMessage[] = [...local]
  // Indexed by both keys: once a bubble has been reconciled it carries the
  // server's id AND its own clientId, and the server may echo either. Matching
  // on one alone shows the message twice.
  const positions = new Map<string, number>()

  const indexAt = (message: ThreadMessage, position: number) => {
    positions.set(message.id, position)
    if (message.clientId) positions.set(message.clientId, position)
  }

  result.forEach(indexAt)

  for (const message of remote) {
    const known =
      positions.get(message.id) ??
      (message.clientId ? positions.get(message.clientId) : undefined)

    if (known !== undefined && result[known]) {
      result[known] = { ...result[known], ...message, status: 'sent' }
      indexAt(result[known], known)
      continue
    }

    const merged: ThreadMessage = { ...message, status: 'sent' }
    indexAt(merged, result.length)
    result.push(merged)
  }

  return result
}

/** The disclosure has to match whoever is actually answering. */
function disclosureFor(messages: ThreadMessage[]): string {
  const kinds = new Set<AuthorKind>()
  for (const message of messages) {
    if (message.from === 'support') kinds.add(message.authorKind ?? 'scripted')
  }
  if (kinds.has('human')) return CHAT_COPY.humanNotice
  if (kinds.has('assistant')) return CHAT_COPY.assistantNotice
  return CHAT_COPY.automatedNotice
}

function fillTemplate(text: string, ticket: string | null): string {
  return text.replace(/\{ticket\}/g, ticket ?? '')
}

function timeStamp(): string {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/** The only route by which a request actually reaches the studio. */
function buildMailtoHref(
  ticket: string | null,
  lead: LeadFields | null,
  messages: ChatMessage[]
): string {
  const answers = FORM_FIELDS.map((field) => {
    const value = lead?.[field.name]
    return value ? `${field.label}: ${value}` : null
  }).filter((line): line is string => line !== null)

  const said = messages
    .filter((message) => message.from === 'visitor')
    .map((message) => `- ${message.text}`)

  const body = [
    `Request ${ticket ?? ''}`,
    '',
    ...answers,
    ...(said.length ? ['', 'What I added in chat:', ...said] : []),
  ].join('\n')

  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    `Website request ${ticket ?? ''}`
  )}&body=${encodeURIComponent(body)}`
}

function usePrefersReducedMotion(): boolean {
  // read synchronously on mount instead of setting state inside the effect
  const [reduced, setReduced] = useState(
    () => isBrowser && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    if (!isBrowser) return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return reduced
}

export function ChatProvider({ children }: { children: ReactNode }) {
  // Read storage exactly once, via a lazy initialiser rather than a ref, so
  // nothing touches ref.current during render.
  const [initial] = useState(readStoredRequest)

  const createdAt = useRef<number>(initial?.createdAt ?? 0)

  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<ChatView>(initial ? 'chat' : 'form')
  const [ticket, setTicket] = useState<string | null>(initial?.ticket ?? null)
  const [lead, setLead] = useState<LeadFields | null>(initial?.lead ?? null)
  const [messages, setMessages] = useState<ThreadMessage[]>(initial?.messages ?? [])
  const [typing, setTyping] = useState(false)
  const [unread, setUnread] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const [storageOk, setStorageOk] = useState(true)
  const [delivery, setDelivery] = useState<Delivery>(() =>
    initial && outbox.has(initial.ticket) ? 'failed' : 'idle'
  )
  const [retrying, setRetrying] = useState(false)
  // mirrors scriptIndex so the email route can appear without reading a ref
  const [scriptDone, setScriptDone] = useState(
    (initial?.scriptIndex ?? 0) >= SUPPORT_SCRIPT.length
  )

  const scriptIndex = useRef<number>(initial?.scriptIndex ?? 0)
  const timers = useRef<number[]>([])
  const threadRef = useRef<HTMLDivElement>(null)
  const openRef = useRef(false)
  const launcherRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    openRef.current = isOpen
  }, [isOpen])

  useEffect(
    () => () => {
      timers.current.forEach((id) => clearTimeout(id))
      timers.current = []
    },
    []
  )

  // once the hero has scrolled away the launcher also carries the offer line
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.7)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!ticket) return
    const ok = writeStoredRequest({
      v: 1,
      createdAt: createdAt.current || Date.now(),
      ticket,
      lead,
      messages,
      scriptIndex: scriptIndex.current,
    })
    // private browsing or quota: keep working in memory, but say so
    if (!ok) setStorageOk(false)
  }, [ticket, lead, messages])

  useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, typing, view, isOpen])

  const pushMessage = useCallback((message: ThreadMessage) => {
    setMessages((prev) => [...prev, message])
    if (message.from === 'support' && !openRef.current) {
      setUnread((n) => n + 1)
    }
  }, [])

  const advanceScript = useCallback(
    (currentLead: LeadFields | null, currentTicket: string | null, delay = 1400) => {
      const index = scriptIndex.current

      // script exhausted: one fallback per visitor message, pointing at email
      if (index >= SUPPORT_SCRIPT.length) {
        setTyping(true)
        const fallbackTimer = window.setTimeout(() => {
          setTyping(false)
          pushMessage({
            id: `f-${Date.now()}`,
            from: 'support',
            text: fillTemplate(CHAT_COPY.fallbackReply, currentTicket),
            at: timeStamp(),
          })
        }, delay)
        timers.current.push(fallbackTimer)
        return
      }

      scriptIndex.current = index + 1
      if (scriptIndex.current >= SUPPORT_SCRIPT.length) setScriptDone(true)
      setTyping(true)

      const isLowBudget = currentLead?.budget === '$200 to $400'
      const raw =
        index === 2 && isLowBudget
          ? SUPPORT_SCRIPT_LOW_BUDGET
          : (SUPPORT_SCRIPT[index] ?? '')

      const timer = window.setTimeout(() => {
        setTyping(false)
        pushMessage({
          id: `s${index}`,
          from: 'support',
          text: fillTemplate(raw, currentTicket),
          at: timeStamp(),
        })
      }, delay)

      timers.current.push(timer)
    },
    [pushMessage]
  )

  const open = useCallback(() => {
    setIsOpen(true)
    setUnread(0)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    launcherRef.current?.focus()
  }, [])

  const submitForm = useCallback(
    async (values: LeadFields) => {
      // Mint a local id first so the thread opens instantly, then let the
      // server override it if one is configured and answers with its own.
      let newTicket = makeTicketId()
      try {
        const registered = await createLead(values, newTicket)
        if (registered.ticket) newTicket = registered.ticket
        setDelivery(registered.local ? 'local' : 'sent')
      } catch (error) {
        // The visitor did their part; the thread still opens. What changes is
        // that the panel says the submission has not landed yet.
        queueFailedLead(values, newTicket, error)
        setDelivery('failed')
      }

      const summary = [
        values.businessName,
        values.businessType,
        values.needType,
        values.budget || null,
      ]
        .filter(Boolean)
        .join(' · ')

      createdAt.current = Date.now()
      setTicket(newTicket)
      setLead(values)
      setView('chat')
      setMessages([{ id: 'lead-0', from: 'visitor', text: summary, at: timeStamp() }])

      advanceScript(values, newTicket, 900)
      const second = window.setTimeout(() => advanceScript(values, newTicket, 1200), 2600)
      timers.current.push(second)
    },
    [advanceScript]
  )

  /** Deliver one visitor message and settle its bubble. */
  const deliver = useCallback(
    async (clientId: string, text: string, currentTicket: string) => {
      try {
        const saved = await postMessage(currentTicket, text, clientId)
        setMessages((prev) =>
          prev.map((message) =>
            message.clientId === clientId
              ? { ...message, ...saved, clientId, status: 'sent' }
              : message
          )
        )
      } catch {
        // the bubble stays, marked undelivered, with its own retry
        setMessages((prev) =>
          prev.map((message) =>
            message.clientId === clientId ? { ...message, status: 'failed' } : message
          )
        )
      }
    },
    []
  )

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim().slice(0, 500)
      if (!trimmed || !ticket) return
      const clientId = newClientId()
      pushMessage({
        id: clientId,
        clientId,
        from: 'visitor',
        text: trimmed,
        at: timeStamp(),
        status: 'sending',
      })
      void deliver(clientId, trimmed, ticket)
      advanceScript(lead, ticket)
    },
    [advanceScript, deliver, lead, pushMessage, ticket]
  )

  const retryMessage = useCallback(
    (clientId: string) => {
      if (!ticket) return
      const target = messages.find((message) => message.clientId === clientId)
      if (!target) return
      setMessages((prev) =>
        prev.map((message) =>
          message.clientId === clientId ? { ...message, status: 'sending' } : message
        )
      )
      void deliver(clientId, target.text, ticket)
    },
    [deliver, messages, ticket]
  )

  // Reopening the panel reconciles with whatever the server has. Harmless
  // against the stub, and the whole point once a real operator can reply.
  useEffect(() => {
    if (!isOpen || !ticket) return
    let active = true
    void getThread(ticket).then((thread) => {
      if (!active || thread.messages.length === 0) return
      setMessages((prev) => mergeThreads(prev, thread.messages))
    })
    return () => {
      active = false
    }
  }, [isOpen, ticket])

  const retryDelivery = useCallback(async () => {
    setRetrying(true)
    try {
      const delivered = await flushOutbox()
      if (delivered > 0) setDelivery('sent')
    } finally {
      setRetrying(false)
    }
  }, [])

  // the browser coming back online is the one moment worth retrying unprompted
  useEffect(() => {
    if (delivery !== 'failed') return
    const onOnline = () => {
      void retryDelivery()
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [delivery, retryDelivery])

  const reset = useCallback(() => {
    timers.current.forEach((id) => clearTimeout(id))
    timers.current = []
    clearStoredRequest()
    scriptIndex.current = 0
    createdAt.current = 0
    setScriptDone(false)
    setTicket(null)
    setLead(null)
    setMessages([])
    setTyping(false)
    setView('form')
    setDelivery('idle')
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  const value = useMemo<ChatContextValue>(
    () => ({ open, hasRequest: Boolean(ticket) }),
    [open, ticket]
  )

  return (
    <ChatContext.Provider value={value}>
      {children}
      <ErrorBoundary label="chat" variant="widget">
        <ChatLauncher
          ref={launcherRef}
          isOpen={isOpen}
          unread={unread}
          scrolled={scrolled}
          ticket={ticket}
          onOpen={open}
          onClose={close}
        />
        {isOpen && (
          <ChatPanel
            view={view}
            ticket={ticket}
            lead={lead}
            messages={messages}
            typing={typing}
            storageOk={storageOk}
            scriptDone={scriptDone}
            delivery={delivery}
            retrying={retrying}
            threadRef={threadRef}
            onClose={close}
            onSubmit={submitForm}
            onSend={sendMessage}
            onReset={reset}
            onRetryDelivery={retryDelivery}
            onRetryMessage={retryMessage}
          />
        )}
      </ErrorBoundary>
    </ChatContext.Provider>
  )
}

/* ---------------------------------------------------------------- launcher */

interface ChatLauncherProps {
  ref?: Ref<HTMLButtonElement>
  isOpen: boolean
  unread: number
  scrolled: boolean
  ticket: string | null
  onOpen: () => void
  onClose: () => void
}

function ChatLauncher({
  ref,
  isOpen,
  unread,
  scrolled,
  ticket,
  onOpen,
  onClose,
}: ChatLauncherProps) {
  const showOffer = !isOpen && scrolled && !ticket

  return (
    <button
      ref={ref}
      className={`chat-launcher${isOpen ? ' chat-launcher-open' : ''}${
        showOffer ? ' chat-launcher-wide' : ''
      }`}
      type="button"
      onClick={isOpen ? onClose : onOpen}
      aria-expanded={isOpen}
    >
      {showOffer && <span className="chat-launcher-offer">{STICKY_CTA.line}</span>}

      <span className="chat-launcher-label">
        {isOpen
          ? CHAT_COPY.launcherOpen
          : ticket
            ? CHAT_COPY.launcherReturning
            : CHAT_COPY.launcher}
      </span>

      {!isOpen && unread > 0 && <span className="chat-dot" aria-hidden="true" />}
    </button>
  )
}

/* ------------------------------------------------------------------- panel */

interface ChatPanelProps {
  view: ChatView
  ticket: string | null
  lead: LeadFields | null
  messages: ThreadMessage[]
  typing: boolean
  storageOk: boolean
  scriptDone: boolean
  delivery: Delivery
  retrying: boolean
  threadRef: RefObject<HTMLDivElement | null>
  onClose: () => void
  onSubmit: (values: LeadFields) => void
  onSend: (text: string) => void
  onReset: () => void
  onRetryDelivery: () => void
  onRetryMessage: (clientId: string) => void
}

function ChatPanel({
  view,
  ticket,
  lead,
  messages,
  typing,
  storageOk,
  scriptDone,
  delivery,
  retrying,
  threadRef,
  onClose,
  onSubmit,
  onSend,
  onReset,
  onRetryDelivery,
  onRetryMessage,
}: ChatPanelProps) {
  return (
    <section className="chat-panel" role="dialog" aria-label="Get a price">
      <header className="chat-head">
        <div className="chat-head-main">
          <div className="chat-head-title">
            {view === 'form' ? CHAT_COPY.formTitle : CHAT_COPY.threadTitle}
          </div>
          {view === 'chat' && ticket && <div className="chat-ticket">{ticket}</div>}
        </div>
        <button
          className="chat-close"
          type="button"
          onClick={onClose}
          aria-label="Close chat"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path
              d="M2 2l8 8M10 2l-8 8"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      <p className="chat-disclosure">{disclosureFor(messages)}</p>

      {!storageOk && <p className="chat-disclosure">{CHAT_COPY.storageWarning}</p>}

      {view === 'form' ? (
        <LeadForm onSubmit={onSubmit} />
      ) : (
        <Thread
          ticket={ticket}
          lead={lead}
          messages={messages}
          typing={typing}
          scriptDone={scriptDone}
          storageOk={storageOk}
          delivery={delivery}
          retrying={retrying}
          threadRef={threadRef}
          onSend={onSend}
          onReset={onReset}
          onRetryDelivery={onRetryDelivery}
          onRetryMessage={onRetryMessage}
        />
      )}
    </section>
  )
}

/* --------------------------------------------------------------- lead form */

type FormValues = Record<keyof LeadFields, string>

const EMPTY_FORM: FormValues = FORM_FIELDS.reduce(
  (acc, field) => ({ ...acc, [field.name]: '' }),
  {} as FormValues
)

function LeadForm({ onSubmit }: { onSubmit: (values: LeadFields) => void }) {
  const [values, setValues] = useState<FormValues>(EMPTY_FORM)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const firstRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstRef.current?.focus()
  }, [])

  const setField = (name: keyof LeadFields, nextValue: string) => {
    setValues((prev) => ({ ...prev, [name]: nextValue }))
    if (error) setError('')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const missing = FORM_FIELDS.filter(
      (field) => field.required && !values[field.name]?.trim()
    )
    if (missing.length) {
      setError(`Still needed: ${missing.map((f) => f.label.toLowerCase()).join(', ')}`)
      return
    }
    setBusy(true)
    // cosmetic beat so the transition does not read as a page jump
    window.setTimeout(() => onSubmit(values), 500)
  }

  return (
    <form className="chat-form" onSubmit={handleSubmit}>
      <p className="chat-form-sub">{CHAT_COPY.formSub}</p>

      {FORM_FIELDS.map((field, index) => (
        <div className="chat-field" key={field.name}>
          <span className="chat-field-label">
            {field.label}
            {!field.required && <span className="chat-optional"> · optional</span>}
          </span>

          {field.type === 'select' ? (
            <div className="chat-chips">
              {field.options.map((option) => (
                <button
                  className={`chat-chip${
                    values[field.name] === option ? ' chat-chip-on' : ''
                  }`}
                  type="button"
                  key={option}
                  onClick={() => setField(field.name, option)}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <input
              ref={index === 0 ? firstRef : undefined}
              className="chat-input"
              type="text"
              value={values[field.name]}
              onChange={(event) => setField(field.name, event.target.value)}
              placeholder={field.placeholder}
              aria-label={field.label}
            />
          )}
        </div>
      ))}

      {error && (
        <p className="chat-error" role="alert">
          {error}
        </p>
      )}

      <button className="chat-submit" type="submit" disabled={busy}>
        {busy ? CHAT_COPY.submittingLabel : CHAT_COPY.submitLabel}
      </button>
    </form>
  )
}

/* ------------------------------------------------------------------ thread */

interface ThreadProps {
  ticket: string | null
  lead: LeadFields | null
  messages: ThreadMessage[]
  typing: boolean
  scriptDone: boolean
  storageOk: boolean
  delivery: Delivery
  retrying: boolean
  threadRef: RefObject<HTMLDivElement | null>
  onSend: (text: string) => void
  onReset: () => void
  onRetryDelivery: () => void
  onRetryMessage: (clientId: string) => void
}

function Thread({
  ticket,
  lead,
  messages,
  typing,
  scriptDone,
  storageOk,
  delivery,
  retrying,
  threadRef,
  onSend,
  onReset,
  onRetryDelivery,
  onRetryMessage,
}: ThreadProps) {
  const [draft, setDraft] = useState('')
  const reducedMotion = usePrefersReducedMotion()
  // a failed delivery makes the email route the point, not an afterthought
  const showEmailRoute = scriptDone || !storageOk || delivery === 'failed'

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSend(draft)
    setDraft('')
  }

  return (
    <>
      {delivery === 'failed' && (
        <div className="chat-undelivered" role="alert">
          <p className="chat-undelivered-text">{CHAT_COPY.deliveryFailed}</p>
          <button
            className="chat-undelivered-retry"
            type="button"
            onClick={onRetryDelivery}
            disabled={retrying}
          >
            {retrying ? CHAT_COPY.deliveryRetrying : CHAT_COPY.deliveryRetry}
          </button>
        </div>
      )}

      <div className="chat-thread" ref={threadRef}>
        <div aria-live="polite">
          {messages.map((message) => (
            <div className={`chat-msg chat-msg-${message.from}`} key={message.id}>
              <div className="chat-bubble">{message.text}</div>
              <div className="chat-time">
                {message.from === 'support' ? (
                  <>
                    {message.agent?.name ?? CHAT_COPY.supportName}
                    {message.authorKind !== 'human' && (
                      <span className="chat-auto-tag"> · {CHAT_COPY.supportTag}</span>
                    )}
                  </>
                ) : (
                  'You'
                )}{' '}
                · {message.at}
                {message.status === 'sending' && (
                  <span className="chat-auto-tag"> · {CHAT_COPY.messageSending}</span>
                )}
                {message.status === 'failed' && (
                  <>
                    <span className="chat-msg-failed"> · {CHAT_COPY.messageFailed}</span>{' '}
                    <button
                      className="chat-msg-retry"
                      type="button"
                      onClick={() => message.clientId && onRetryMessage(message.clientId)}
                    >
                      {CHAT_COPY.messageRetry}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {typing &&
          (reducedMotion ? (
            <p className="chat-typing-text">{CHAT_COPY.typingLabel}</p>
          ) : (
            <div className="chat-msg chat-msg-support">
              <div className="chat-bubble chat-bubble-typing" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>
          ))}
      </div>

      {showEmailRoute && (
        <div className="chat-email-route">
          <a className="chat-email-btn" href={buildMailtoHref(ticket, lead, messages)}>
            {CHAT_COPY.emailLabel}
          </a>
          <p className="chat-email-hint">
            {CHAT_COPY.emailHint} Or write to{' '}
            <span className="chat-email-plain">{CONTACT_EMAIL}</span>
          </p>
        </div>
      )}

      <form className="chat-compose" onSubmit={handleSubmit}>
        <input
          className="chat-compose-input"
          type="text"
          value={draft}
          maxLength={500}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={CHAT_COPY.inputPlaceholder}
          aria-label={CHAT_COPY.inputPlaceholder}
        />
        <button className="chat-send" type="submit" aria-label={CHAT_COPY.sendLabel}>
          <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
            <path
              d="M2.5 6.5h8M7 3l3.5 3.5L7 10"
              stroke="#fafaf9"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>

      <button className="chat-reset" type="button" onClick={onReset}>
        {CHAT_COPY.resetLabel}
      </button>
    </>
  )
}
