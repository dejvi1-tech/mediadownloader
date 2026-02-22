import { useState, useRef, useCallback, useEffect } from 'react'
import './App.css'

function formatDuration(secs) {
  if (!secs) return ''
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = Math.floor(secs % 60)
  return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`
}
function timeAgo(ts, lang) {
  const d = Date.now() - ts
  if (lang === 'de') {
    if (d < 60000) return 'gerade eben'
    if (d < 3600000) return `vor ${Math.floor(d/60000)} Min.`
    if (d < 86400000) return `vor ${Math.floor(d/3600000)} Std.`
    return `vor ${Math.floor(d/86400000)} Tagen`
  }
  if (d < 60000) return 'just now'
  if (d < 3600000) return `${Math.floor(d/60000)}m ago`
  if (d < 86400000) return `${Math.floor(d/3600000)}h ago`
  return `${Math.floor(d/86400000)}d ago`
}

const VIDEO_QUALITIES = [
  { v: '1080', l: 'FHD', s: '1080p' },
  { v: '720',  l: 'HD',  s: '720p'  },
  { v: '480',  l: 'SD',  s: '480p'  },
]
const AUDIO_FMTS = [
  { v: 'mp3',  l: 'MP3',  d: 'Universal'   },
  { v: 'm4a',  l: 'M4A',  d: 'iTunes'      },
  { v: 'flac', l: 'FLAC', d: 'Lossless'    },
  { v: 'wav',  l: 'WAV',  d: 'Uncompressed' },
]
const PLATFORMS = [
  { id: 'YouTube',    label: 'YouTube'     },
  { id: 'Instagram',  label: 'Instagram'   },
  { id: 'TikTok',     label: 'TikTok', pro: true },
  { id: 'Twitter',    label: 'Twitter / X' },
  { id: 'Vimeo',      label: 'Vimeo'       },
  { id: 'SoundCloud', label: 'SoundCloud'  },
]

const PLATFORM_CARDS = [
  { emoji: '▶', bg: '#FEE2E2', color: '#DC2626', name: 'YouTube',    de: 'Videos, Playlists, Shorts', en: 'Videos, playlists, Shorts' },
  { emoji: '📸', bg: '#FCE7F3', color: '#DB2777', name: 'Instagram',  de: 'Reels, Stories, Posts',    en: 'Reels, stories, posts' },
  { emoji: '♪', bg: '#EDE9FE', color: '#7C3AED', name: 'TikTok',     de: 'Videos ohne Wasserzeichen', en: 'Videos without watermark', pro: true },
  { emoji: '✕', bg: '#DBEAFE', color: '#1D4ED8', name: 'Twitter / X', de: 'Videos & GIFs',            en: 'Videos & GIFs' },
  { emoji: '◎', bg: '#D1FAE5', color: '#059669', name: 'Vimeo',      de: 'HD-Videos',                 en: 'HD videos' },
  { emoji: '☁', bg: '#FEF3C7', color: '#D97706', name: 'SoundCloud', de: 'Musik & Podcasts',          en: 'Music & podcasts' },
]

const T = {
  de: {
    heroTitle: 'Videos & Musik herunterladen',
    heroSub: 'Kein Abo · Keine Werbung · 100 % lokal auf deinem Gerät — schnell, sicher und kostenlos.',
    stat1v: '10+', stat1l: 'Plattformen',
    stat2v: 'Gratis', stat2l: 'Immer kostenlos',
    stat3v: '0', stat3l: 'Werbeanzeigen',

    featTitle: 'Warum Media Downloader?',
    featSub: 'Alles was du brauchst — nichts was du nicht brauchst.',
    f1t: 'Alle Plattformen',    f1d: 'YouTube, TikTok, Instagram, Twitter/X, Vimeo, SoundCloud und viele mehr.',
    f2t: 'Ohne Wasserzeichen',  f2d: 'TikTok-Videos sauber und ohne Logo herunterladen (Pro-Funktion).',
    f3t: 'Höchste Qualität',    f3d: 'Bis zu 1080p MP4 oder verlustfreies FLAC/WAV-Audio.',
    f4t: '100 % Privat',        f4d: 'Kein Cloud-Upload. Alle Dateien bleiben auf deinem Gerät.',
    f5t: 'Blitzschnell',        f5d: 'Direkter Download ohne Wartezeiten oder versteckte Limits.',
    f6t: 'Zuschneiden',         f6d: 'Gewünschten Zeitabschnitt eines Videos herunterladen.',

    platformTitle: 'Unterstützte Plattformen',
    platformSub: 'Laden Sie Inhalte von den beliebtesten Videoplattformen der Welt herunter.',

    stepsTitle: 'So einfach geht\'s',
    stepsSub: 'In drei Schritten zum Download — ohne Registrierung.',
    s1: 'Link einfügen', s1d: 'URL aus dem Browser oder der App kopieren und einfügen.',
    s2: 'Format wählen', s2d: 'Video oder Audio, Qualität und weitere Optionen festlegen.',
    s3: 'Herunterladen', s3d: 'Download starten — Datei landet direkt auf deinem Gerät.',

    benefitsTitle: 'Deine Vorteile',
    b1t: 'Keine Registrierung',   b1d: 'Sofort starten ohne Konto oder E-Mail-Adresse.',
    b2t: 'Unbegrenzte Downloads', b2d: 'Lade so viele Videos und Songs herunter, wie du möchtest.',
    b3t: 'Alle Formate',          b3d: 'MP4, MP3, M4A, FLAC, WAV, WebM und mehr.',
    b4t: 'Playlist-Support',      b4d: 'Ganze YouTube-Playlists auf einmal als ZIP herunterladen.',

    faqTitle: 'Häufige Fragen',
    faqSub: 'Antworten auf die wichtigsten Fragen.',
    faqs: [
      { q: 'Ist der Downloader kostenlos?',              a: 'Ja — vollständig kostenlos. Pro-Features wie TikTok ohne Wasserzeichen sind optional.' },
      { q: 'Welche Formate werden unterstützt?',         a: 'Video: MP4 (H.264) in 1080p, 720p und 480p. Audio: MP3, M4A, FLAC, WAV.' },
      { q: 'Werden meine Daten gespeichert?',            a: 'Nein. Alles läuft lokal auf deinem Gerät. Es werden keine Daten übermittelt oder gespeichert.' },
      { q: 'Kann ich ganze Playlists herunterladen?',    a: 'Ja. YouTube-Playlists werden vollständig als ZIP-Datei heruntergeladen.' },
      { q: 'Warum brauche ich Pro für TikTok?',         a: 'Der Download ohne Wasserzeichen nutzt eine spezielle API. Das erfordert etwas mehr Aufwand, daher ist es ein Pro-Feature.' },
    ],

    placeholder: 'Video- oder Audio-Link einfügen…',
    fetchBtn: 'Laden',
    format: 'Format', quality: 'Qualität', audioFmtLabel: 'Audioformat',
    filenameLabel: 'Dateiname', folderLabel: 'Ordnername', optional: 'optional',
    trimLabel: 'Zuschneiden', from: 'Von', to: 'Bis',
    tiktokSection: 'TikTok', noWmCheck: 'Ohne Wasserzeichen herunterladen',
    videoFmt: 'Video', videoSub: 'MP4 · H.264',
    audioOnlyFmt: 'Nur Audio', audioOnlySub: 'Audio extrahieren',
    cancel: 'Abbrechen',
    switchPlaylist: 'Zur Playlist wechseln →',
    alsoPlaylist: 'Diese URL enthält auch eine Playlist.',
    recentDl: 'Letzte Downloads', clearBtn: 'Löschen',
    upgradeBtn: 'Pro upgraden',
    proGateText: 'Download ohne Wasserzeichen — Pro upgraden',
    proGatePrice: 'ab 7,42 $/Mo.',
    footer: 'Betrieben von yt-dlp · Keine Daten verlassen dein Gerät',
    footerPro: 'Pro holen',
    proActive: 'Pro aktiv',
    modal: {
      title: 'Media Downloader Pro',
      sub: 'Premium-Funktionen freischalten',
      feat1: 'TikTok ohne Wasserzeichen',
      feat2: 'Alle aktuellen & zukünftigen Pro-Funktionen',
      feat3: 'Bevorzugter Support',
      monthly: 'Monatlich', yearly: 'Jährlich', save: 'Spare 26 %',
      priceNoteYearly: '≈ 7,42 $ / Monat · jährliche Abrechnung',
      subscribeBtn: 'Mit Stripe abonnieren',
      divider: 'oder Schlüssel eingeben',
      keyPlaceholder: 'MDDL-XXXX-XXXX-XXXX',
      activateBtn: 'Aktivieren',
    },
  },
  en: {
    heroTitle: 'Download Videos & Music',
    heroSub: 'No subscriptions · No ads · 100% local on your device — fast, private and completely free.',
    stat1v: '10+', stat1l: 'Platforms',
    stat2v: 'Free', stat2l: 'Always free',
    stat3v: '0', stat3l: 'Ads',

    featTitle: 'Why Media Downloader?',
    featSub: 'Everything you need — nothing you don\'t.',
    f1t: 'All Platforms',    f1d: 'YouTube, TikTok, Instagram, Twitter/X, Vimeo, SoundCloud and many more.',
    f2t: 'No Watermark',     f2d: 'Download TikTok videos cleanly without the burned-in logo (Pro feature).',
    f3t: 'Highest Quality',  f3d: 'Up to 1080p MP4 or lossless FLAC/WAV audio.',
    f4t: '100% Private',     f4d: 'No cloud upload. All files stay on your device.',
    f5t: 'Lightning Fast',   f5d: 'Direct download with no queues or hidden limits.',
    f6t: 'Trim & Cut',       f6d: 'Download only the exact section of a video you want.',

    platformTitle: 'Supported Platforms',
    platformSub: 'Download content from the world\'s most popular video platforms.',

    stepsTitle: 'As easy as it gets',
    stepsSub: 'Three steps to your download — no sign-up required.',
    s1: 'Paste URL',     s1d: 'Copy any link from your browser or app and paste it.',
    s2: 'Pick format',   s2d: 'Choose video or audio, quality, and extra options.',
    s3: 'Download',      s3d: 'Hit download — the file goes straight to your device.',

    benefitsTitle: 'Your Advantages',
    b1t: 'No sign-up',          b1d: 'Start immediately without an account or email address.',
    b2t: 'Unlimited downloads', b2d: 'Download as many videos and songs as you like.',
    b3t: 'All formats',         b3d: 'MP4, MP3, M4A, FLAC, WAV, WebM and more.',
    b4t: 'Playlist support',    b4d: 'Download entire YouTube playlists at once as a ZIP file.',

    faqTitle: 'Frequently Asked Questions',
    faqSub: 'Answers to the most common questions.',
    faqs: [
      { q: 'Is the downloader free?',              a: 'Yes — completely free. Pro features like TikTok without watermark are optional.' },
      { q: 'What formats are supported?',          a: 'Video: MP4 (H.264) at 1080p, 720p and 480p. Audio: MP3, M4A, FLAC, WAV.' },
      { q: 'Is my data stored anywhere?',          a: 'No. Everything runs locally on your device. No data is transmitted or stored.' },
      { q: 'Can I download full playlists?',       a: 'Yes. YouTube playlists are downloaded entirely as a ZIP file.' },
      { q: 'Why do I need Pro for TikTok?',        a: 'Watermark-free downloads use a special API that requires extra effort, so it\'s a Pro feature.' },
    ],

    placeholder: 'Paste any video or audio URL…',
    fetchBtn: 'Fetch',
    format: 'Format', quality: 'Quality', audioFmtLabel: 'Audio format',
    filenameLabel: 'Filename', folderLabel: 'Folder name', optional: 'optional',
    trimLabel: 'Trim', from: 'From', to: 'To',
    tiktokSection: 'TikTok', noWmCheck: 'Download without watermark',
    videoFmt: 'Video', videoSub: 'MP4 · H.264',
    audioOnlyFmt: 'Audio only', audioOnlySub: 'Extract audio',
    cancel: 'Cancel',
    switchPlaylist: 'Switch to playlist →',
    alsoPlaylist: 'This URL also has a playlist.',
    recentDl: 'Recent downloads', clearBtn: 'Clear',
    upgradeBtn: 'Upgrade to Pro',
    proGateText: 'No-watermark download — Upgrade to Pro',
    proGatePrice: 'from $7.42/mo',
    footer: 'Powered by yt-dlp · No data leaves your machine',
    footerPro: 'Get Pro',
    proActive: 'Pro active',
    modal: {
      title: 'Media Downloader Pro',
      sub: 'Unlock premium features',
      feat1: 'TikTok without watermark',
      feat2: 'All current & future Pro features',
      feat3: 'Priority support',
      monthly: 'Monthly', yearly: 'Yearly', save: 'Save 26%',
      priceNoteYearly: '≈ $7.42 / month · billed annually',
      subscribeBtn: 'Subscribe with Stripe',
      divider: 'or enter an activation key',
      keyPlaceholder: 'MDDL-XXXX-XXXX-XXXX',
      activateBtn: 'Activate',
    },
  },
}

function useHistory() {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ytdl_v2') || '[]') } catch { return [] }
  })
  const push = useCallback(item => {
    setItems(prev => {
      const next = [{ ...item, ts: Date.now() }, ...prev].slice(0, 30)
      localStorage.setItem('ytdl_v2', JSON.stringify(next))
      return next
    })
  }, [])
  const clear = useCallback(() => { localStorage.removeItem('ytdl_v2'); setItems([]) }, [])
  return { items, push, clear }
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="faq-item">
      <button className={`faq-q${open ? ' open' : ''}`} onClick={() => setOpen(o => !o)}>
        {q}
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && <div className="faq-a">{a}</div>}
    </div>
  )
}

export default function App() {
  const [url, setUrl]             = useState('')
  const [info, setInfo]           = useState(null)
  const [loading, setLoading]     = useState(false)
  const [fetchErr, setFetchErr]   = useState('')

  const [type, setTypeRaw]         = useState(() => localStorage.getItem('pref_type')     || 'video')
  const [quality, setQualityRaw]   = useState(() => localStorage.getItem('pref_quality')  || '1080')
  const [audioFmt, setAudioFmtRaw] = useState(() => localStorage.getItem('pref_audiofmt') || 'mp3')
  const setType     = v => { setTypeRaw(v);     localStorage.setItem('pref_type',     v) }
  const setQuality  = v => { setQualityRaw(v);  localStorage.setItem('pref_quality',  v) }
  const setAudioFmt = v => { setAudioFmtRaw(v); localStorage.setItem('pref_audiofmt', v) }

  const [embedThumb, setEmbedThumb] = useState(true)
  const [startTime, setStartTime]   = useState('')
  const [endTime, setEndTime]       = useState('')
  const [filename, setFilename]     = useState('')

  const [dlActive, setDlActive]   = useState(false)
  const [dlDone, setDlDone]       = useState(false)
  const [progress, setProgress]   = useState(0)
  const [statusMsg, setStatusMsg] = useState('')
  const [dlErr, setDlErr]         = useState('')
  const [plStatus, setPlStatus]   = useState(null)

  const [isPro, setIsPro]               = useState(() => localStorage.getItem('pro_active') === '1')
  const [showPricing, setShowPricing]   = useState(false)
  const [pricingPlan, setPricingPlan]   = useState('yearly')
  const [keyInput, setKeyInput]         = useState('')
  const [keyErr, setKeyErr]             = useState('')
  const [keyLoading, setKeyLoading]     = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [noWatermark, setNoWatermark]   = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState(null)

  // German as default language
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'de')
  const t = T[lang]
  const switchLang = () => {
    const next = lang === 'de' ? 'en' : 'de'
    setLang(next); localStorage.setItem('lang', next)
  }

  const [toast, setToast] = useState(null)
  const toastTimer        = useRef(null)
  const esRef             = useRef(null)
  const { items: history, push: addHistory, clear: clearHistory } = useHistory()

  const showToast = useCallback((msg, kind = 'success') => {
    clearTimeout(toastTimer.current)
    setToast({ msg, kind })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }, [])

  const resetDl = () => { setDlActive(false); setProgress(0); setStatusMsg(''); setPlStatus(null) }
  const startNew = () => { setUrl(''); setInfo(null); setDlDone(false); setDlErr(''); setFilename(''); setStartTime(''); setEndTime('') }
  const isTikTok = selectedPlatform === 'TikTok' || url.includes('tiktok.com') || url.includes('vm.tiktok.com')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('paid') === '1') {
      window.history.replaceState({}, '', '/')
      const sessionId = params.get('session_id')
      if (sessionId) {
        fetch('/api/verify-session', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        }).then(r => r.json()).then(d => {
          if (d.valid) { localStorage.setItem('pro_active', '1'); setIsPro(true); showToast('Pro activated!') }
        }).catch(() => {})
      }
    }
  }, [showToast])

  const fetchInfo = useCallback(async (forcePlaylist = false, overrideUrl = null) => {
    const trimmed = (overrideUrl ?? url).trim()
    if (!trimmed) return
    setLoading(true); setFetchErr(''); setInfo(null); setDlErr('')
    setFilename(''); setStartTime(''); setEndTime('')
    try {
      const p = new URLSearchParams({ url: trimmed })
      if (forcePlaylist) p.set('forcePlaylist', 'true')
      const r = await fetch(`/api/info?${p}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      setInfo(d); setFilename(d.title || '')
    } catch (e) { setFetchErr(e.message) }
    finally { setLoading(false) }
  }, [url])

  useEffect(() => {
    navigator.clipboard.readText()
      .then(text => { const t = text?.trim(); if (t?.startsWith('http')) { setUrl(t); fetchInfo(false, t) } })
      .catch(() => {})
  }, []) // eslint-disable-line

  useEffect(() => {
    const handler = async (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== 'v') return
      const active = document.activeElement
      if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') return
      e.preventDefault()
      try {
        const text = (await navigator.clipboard.readText()).trim()
        if (text.startsWith('http')) { setUrl(text); fetchInfo(false, text) }
      } catch {}
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [fetchInfo])

  const subscribe = async () => {
    setCheckoutLoading(true); setKeyErr('')
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: pricingPlan }),
      })
      const d = await r.json()
      if (d.url) { window.location.href = d.url }
      else if (d.error === 'stripe_not_configured') setKeyErr(lang === 'de' ? 'Stripe nicht konfiguriert. Bitte Aktivierungsschlüssel verwenden.' : 'Stripe not configured. Use an activation key.')
      else setKeyErr(d.error || (lang === 'de' ? 'Checkout fehlgeschlagen.' : 'Checkout failed.'))
    } catch { setKeyErr(lang === 'de' ? 'Verbindungsfehler.' : 'Checkout failed. Check your connection.') }
    setCheckoutLoading(false)
  }

  const activatePro = async () => {
    if (!keyInput.trim()) return
    setKeyLoading(true); setKeyErr('')
    try {
      const r = await fetch('/api/activate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyInput.trim() }),
      })
      const d = await r.json()
      if (d.valid) {
        localStorage.setItem('pro_active', '1'); setIsPro(true)
        setShowPricing(false); setKeyInput('')
        showToast(lang === 'de' ? 'Pro aktiviert! TikTok ohne Wasserzeichen freigeschaltet.' : 'Pro activated! TikTok no-watermark unlocked.')
      } else { setKeyErr(d.error || (lang === 'de' ? 'Ungültiger Schlüssel' : 'Invalid key')) }
    } catch { setKeyErr(lang === 'de' ? 'Aktivierung fehlgeschlagen.' : 'Activation failed.') }
    setKeyLoading(false)
  }

  const startDownload = () => {
    if (!info || dlActive) return
    setDlActive(true); setProgress(0); setStatusMsg(lang === 'de' ? 'Verbinde…' : 'Connecting…'); setDlErr(''); setPlStatus(null)
    const p = new URLSearchParams({
      url: url.trim(), type, quality, audioFormat: audioFmt,
      embedThumb: embedThumb ? 'true' : 'false',
      startTime, endTime, customName: filename.trim(),
      isPlaylist: info.isPlaylist ? 'true' : 'false',
      noWatermark: (noWatermark && isTikTok && isPro) ? 'true' : 'false',
    })
    const es = new EventSource(`/api/download?${p}`)
    esRef.current = es
    es.onmessage = e => {
      const d = JSON.parse(e.data)
      if (d.type === 'playlist_item') {
        setPlStatus({ current: d.current, total: d.total })
        setProgress(Math.round(((d.current - 1) / d.total) * 100))
        setStatusMsg(`Video ${d.current} / ${d.total}`)
      } else if (d.type === 'progress') {
        setProgress(d.percent)
        setStatusMsg(prev => {
          const prefix = prev.includes('/') ? prev.split('·')[0].trim() + '  ·  ' : ''
          return `${prefix}${d.percent.toFixed(1)}%  ·  ${d.speed}  ·  ETA ${d.eta}`
        })
      } else if (d.type === 'status') {
        setStatusMsg(d.message)
      } else if (d.type === 'done') {
        setProgress(100); setStatusMsg(lang === 'de' ? 'Fertig!' : 'Done!'); es.close()
        addHistory({ url: url.trim(), title: info.title, thumbnail: info.thumbnail,
          type, quality, audioFmt, isPlaylist: !!info.isPlaylist, count: info.count })
        showToast(info.isPlaylist
          ? (lang === 'de' ? 'Playlist heruntergeladen!' : 'Playlist downloaded!')
          : (lang === 'de' ? 'Download abgeschlossen!' : 'Download complete!'))
        window.location.href = `/api/file/${d.fileId}`
        setTimeout(() => { resetDl(); setDlDone(true) }, 3000)
      } else if (d.type === 'error') {
        setDlErr(d.message); resetDl(); es.close()
      }
    }
    es.onerror = () => { setDlErr(lang === 'de' ? 'Verbindung unterbrochen. Bitte erneut versuchen.' : 'Connection failed. Try again.'); resetDl(); es.close() }
  }

  const cancelDownload = () => { esRef.current?.close(); resetDl() }
  const paste = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim()
      setUrl(text); if (text.startsWith('http')) fetchInfo(false, text)
    } catch {}
  }

  const dlLabel = () => {
    if (info?.isPlaylist) return lang === 'de' ? `${info.count} Videos als ZIP` : `Download ${info.count} videos as ZIP`
    if (type === 'audio') return lang === 'de' ? `${audioFmt.toUpperCase()} herunterladen` : `Download ${audioFmt.toUpperCase()}`
    const extra = [startTime || endTime ? t.trimLabel : null, noWatermark && isTikTok && isPro ? '✓ no watermark' : null].filter(Boolean).join(' · ')
    return lang === 'de'
      ? `${quality}p MP4 herunterladen${extra ? '  · ' + extra : ''}`
      : `Download ${quality}p MP4${extra ? '  · ' + extra : ''}`
  }

  const PricingModal = () => (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPricing(false)}>
      <div className="modal">
        <button className="modal-close" onClick={() => setShowPricing(false)}><XIcon /></button>
        <div className="modal-head">
          <div className="pro-badge-lg">PRO</div>
          <h2>{t.modal.title}</h2>
          <p>{t.modal.sub}</p>
        </div>
        <ul className="pro-feat-list">
          {[t.modal.feat1, t.modal.feat2, t.modal.feat3].map(f => (
            <li key={f}><CheckIcon />{f}</li>
          ))}
        </ul>
        <div className="plan-toggle">
          <button className={pricingPlan === 'monthly' ? 'active' : ''} onClick={() => setPricingPlan('monthly')}>
            {t.modal.monthly}
          </button>
          <button className={pricingPlan === 'yearly' ? 'active' : ''} onClick={() => setPricingPlan('yearly')}>
            {t.modal.yearly} <span className="save-chip">{t.modal.save}</span>
          </button>
        </div>
        <div className="price-display">
          <span className="price-amount">{pricingPlan === 'yearly' ? '$89' : '$9.99'}</span>
          <span className="price-period">{pricingPlan === 'yearly' ? ' / year' : ' / month'}</span>
          {pricingPlan === 'yearly' && <div className="price-note">{t.modal.priceNoteYearly}</div>}
        </div>
        <button className="subscribe-btn" onClick={subscribe} disabled={checkoutLoading}>
          {checkoutLoading ? <Dots white /> : <><CardIcon />{t.modal.subscribeBtn}</>}
        </button>
        <div className="modal-divider"><span>{t.modal.divider}</span></div>
        <div className="activate-row">
          <input type="text" className="text-field" placeholder={t.modal.keyPlaceholder}
            value={keyInput} onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && activatePro()} />
          <button className="activate-btn" onClick={activatePro} disabled={keyLoading || !keyInput.trim()}>
            {keyLoading ? <Dots /> : t.modal.activateBtn}
          </button>
        </div>
        {keyErr && <div className="key-err">{keyErr}</div>}
      </div>
    </div>
  )

  return (
    <div className="app">

      {toast && <div className={`toast toast-${toast.kind}`}><CheckIcon />{toast.msg}</div>}
      {showPricing && <PricingModal />}

      {/* ── Header ── */}
      <header>
        <div className="header-row">
          <div className="logo"><YTLogo /><span>Media Downloader</span></div>
          <div className="header-actions">
            <button className="lang-btn" onClick={switchLang}>
              {lang === 'de' ? '🇬🇧 EN' : '🇩🇪 DE'}
            </button>
            {isPro
              ? <div className="pro-badge">PRO</div>
              : <button className="upgrade-btn" onClick={() => setShowPricing(true)}>{t.upgradeBtn}</button>
            }
          </div>
        </div>
        <div className="platforms">
          {PLATFORMS.map(p => (
            <button key={p.id}
              className={`platform-chip${selectedPlatform === p.id ? ' active' : ''}${p.pro ? ' has-pro' : ''}`}
              onClick={() => setSelectedPlatform(prev => prev === p.id ? null : p.id)}>
              {p.label}
              {p.pro && <span className="chip-pro-tag">PRO</span>}
            </button>
          ))}
        </div>
      </header>

      {/* ── Search bar ── */}
      <div className="searchbar">
        <input type="url" placeholder={t.placeholder} value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchInfo()}
          spellCheck={false} autoComplete="off" />
        {url && <button className="icon-btn" onClick={() => { setUrl(''); setInfo(null) }}><XIcon /></button>}
        <button className="icon-btn muted" onClick={paste} title="Paste"><ClipboardIcon /></button>
        <button className="fetch-btn" onClick={() => fetchInfo()} disabled={loading || !url.trim()}>
          {loading ? <Dots /> : t.fetchBtn}
        </button>
      </div>

      {fetchErr && <div className="banner error">{fetchErr}</div>}

      {/* ── Landing (shown only when no video loaded) ── */}
      {!info && !loading && (
        <>
          {/* Hero */}
          <div className="hero">
            <h1>{t.heroTitle}</h1>
            <p className="hero-sub">{t.heroSub}</p>
          </div>

          {/* Stats */}
          <div className="stats-row">
            <div className="stat"><b>{t.stat1v}</b><span>{t.stat1l}</span></div>
            <div className="stat-div" />
            <div className="stat"><b>{t.stat2v}</b><span>{t.stat2l}</span></div>
            <div className="stat-div" />
            <div className="stat"><b>{t.stat3v}</b><span>{t.stat3l}</span></div>
          </div>

          {/* Features */}
          <section className="features-section">
            <h2 className="section-title">{t.featTitle}</h2>
            <p className="section-sub">{t.featSub}</p>
            <div className="features-grid">
              <div className="feat-card">
                <div className="feat-icon fi-red"><GlobeIcon /></div>
                <h3>{t.f1t}</h3><p>{t.f1d}</p>
              </div>
              <div className="feat-card">
                <div className="feat-icon fi-orange"><TikTokIcon /></div>
                <h3>{t.f2t}</h3><p>{t.f2d}</p>
              </div>
              <div className="feat-card">
                <div className="feat-icon fi-blue"><VideoIcon /></div>
                <h3>{t.f3t}</h3><p>{t.f3d}</p>
              </div>
              <div className="feat-card">
                <div className="feat-icon fi-green"><LockIcon /></div>
                <h3>{t.f4t}</h3><p>{t.f4d}</p>
              </div>
              <div className="feat-card">
                <div className="feat-icon fi-purple"><BoltIcon /></div>
                <h3>{t.f5t}</h3><p>{t.f5d}</p>
              </div>
              <div className="feat-card">
                <div className="feat-icon fi-orange"><ScissorsIcon /></div>
                <h3>{t.f6t}</h3><p>{t.f6d}</p>
              </div>
            </div>
          </section>

          {/* Platform Showcase */}
          <section className="platforms-section">
            <h2 className="section-title">{t.platformTitle}</h2>
            <p className="section-sub">{t.platformSub}</p>
            <div className="platform-grid">
              {PLATFORM_CARDS.map(pc => (
                <div className="platform-card" key={pc.name}>
                  <div className="pc-icon" style={{ background: pc.bg, color: pc.color }}>
                    <span style={{ fontSize: '1.5rem' }}>{pc.emoji}</span>
                  </div>
                  <h4>{pc.name}</h4>
                  <p>{lang === 'de' ? pc.de : pc.en}</p>
                  {pc.pro && <span className="pc-pro">PRO</span>}
                </div>
              ))}
            </div>
          </section>

          {/* How it works */}
          <section className="steps-section">
            <h2 className="section-title">{t.stepsTitle}</h2>
            <p className="section-sub">{t.stepsSub}</p>
            <div className="steps-row">
              <div className="step">
                <div className="step-num">1</div>
                <p><strong>{t.s1}</strong></p>
                <p style={{ fontSize: '.76rem', color: 'var(--txt3)' }}>{t.s1d}</p>
              </div>
              <div className="step-div" />
              <div className="step">
                <div className="step-num">2</div>
                <p><strong>{t.s2}</strong></p>
                <p style={{ fontSize: '.76rem', color: 'var(--txt3)' }}>{t.s2d}</p>
              </div>
              <div className="step-div" />
              <div className="step">
                <div className="step-num">3</div>
                <p><strong>{t.s3}</strong></p>
                <p style={{ fontSize: '.76rem', color: 'var(--txt3)' }}>{t.s3d}</p>
              </div>
            </div>
          </section>

          {/* Benefits */}
          <section className="benefits-section">
            <h2 className="section-title">{t.benefitsTitle}</h2>
            <div className="benefits-grid">
              <div className="benefit-row">
                <div className="benefit-icon fi-blue"><UserIcon /></div>
                <div><h4>{t.b1t}</h4><p>{t.b1d}</p></div>
              </div>
              <div className="benefit-row">
                <div className="benefit-icon fi-green"><InfinityIcon /></div>
                <div><h4>{t.b2t}</h4><p>{t.b2d}</p></div>
              </div>
              <div className="benefit-row">
                <div className="benefit-icon fi-orange"><MusicIcon /></div>
                <div><h4>{t.b3t}</h4><p>{t.b3d}</p></div>
              </div>
              <div className="benefit-row">
                <div className="benefit-icon fi-purple"><ListIcon /></div>
                <div><h4>{t.b4t}</h4><p>{t.b4d}</p></div>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="faq-section">
            <h2 className="section-title">{t.faqTitle}</h2>
            <p className="section-sub">{t.faqSub}</p>
            <div className="faq-list">
              {t.faqs.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
            </div>
          </section>
        </>
      )}

      {/* ── Info card ── */}
      {info && (
        <div className="card">
          <div className="media-row">
            {info.thumbnail && (
              <img src={info.thumbnail} alt="" className="thumb"
                onError={e => { e.target.style.display = 'none' }} />
            )}
            <div className="media-text">
              {info.isPlaylist && <div className="pill"><ListIcon />{info.count} {lang === 'de' ? 'Videos' : 'videos'}</div>}
              <h2 className="title">{info.title}</h2>
              <div className="meta">
                {info.uploader && <span>{info.uploader}</span>}
                {!info.isPlaylist && info.duration > 0 && <span>{formatDuration(info.duration)}</span>}
              </div>
            </div>
          </div>

          {!info.isPlaylist && info.hasPlaylist && (
            <div className="banner warning">
              <InfoIcon />
              <span>{t.alsoPlaylist}</span>
              <button onClick={() => fetchInfo(true)}>{t.switchPlaylist}</button>
            </div>
          )}

          <div className="rule" />

          {/* FORMAT */}
          <div className="row-section">
            <div className="row-label">{t.format}</div>
            <div className="fmt-row">
              <button className={`fmt-btn ${type === 'video' ? 'on' : ''}`} onClick={() => setType('video')}>
                <VideoIcon />
                <div><b>{t.videoFmt}</b><span>{t.videoSub}</span></div>
              </button>
              <button className={`fmt-btn ${type === 'audio' ? 'on' : ''}`} onClick={() => setType('audio')}>
                <MusicIcon />
                <div><b>{t.audioOnlyFmt}</b><span>{t.audioOnlySub}</span></div>
              </button>
            </div>
          </div>

          {/* QUALITY */}
          {type === 'video' && (
            <div className="row-section">
              <div className="row-label">{t.quality}</div>
              <div className="q-grid">
                {VIDEO_QUALITIES.map(q => (
                  <button key={q.v} className={`q-btn ${quality === q.v ? 'on' : ''}`} onClick={() => setQuality(q.v)}>
                    <b>{q.l}</b><span>{q.s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AUDIO FORMAT */}
          {type === 'audio' && (
            <div className="row-section">
              <div className="row-label">{t.audioFmtLabel}</div>
              <div className="af-row">
                {AUDIO_FMTS.map(f => (
                  <button key={f.v} className={`af-btn ${audioFmt === f.v ? 'on' : ''}`} onClick={() => setAudioFmt(f.v)}>
                    <b>{f.l}</b><span>{f.d}</span>
                  </button>
                ))}
              </div>
              <label className="checkbox-row">
                <input type="checkbox" checked={embedThumb} onChange={e => setEmbedThumb(e.target.checked)} />
                {lang === 'de' ? 'Cover als Albumart einbetten' : 'Embed thumbnail as album art'}
              </label>
            </div>
          )}

          {/* TIKTOK NO-WATERMARK (Pro) */}
          {isTikTok && (
            <div className="row-section">
              <div className="row-label">
                {t.tiktokSection}
                {!isPro && <span className="pro-label-tag">PRO</span>}
              </div>
              {isPro
                ? <label className="checkbox-row">
                    <input type="checkbox" checked={noWatermark} onChange={e => setNoWatermark(e.target.checked)} />
                    {t.noWmCheck}
                  </label>
                : <button className="pro-gate-btn" onClick={() => setShowPricing(true)}>
                    <LockIcon />{t.proGateText}
                    <span className="pro-gate-price">{t.proGatePrice}</span>
                  </button>
              }
            </div>
          )}

          {/* FILENAME */}
          <div className="row-section">
            <div className="row-label">
              {info.isPlaylist ? t.folderLabel : t.filenameLabel}
              <span className="tag">{t.optional}</span>
            </div>
            <input className="text-field" type="text" value={filename}
              onChange={e => setFilename(e.target.value)} placeholder={info.title || '…'} />
          </div>

          {/* TRIM */}
          {!info.isPlaylist && (
            <div className="row-section">
              <div className="row-label">{t.trimLabel}<span className="tag">{t.optional}</span></div>
              <div className="trim-row">
                <div className="timebox">
                  <span>{t.from}</span>
                  <input type="text" placeholder="0:00" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <span className="trim-arrow">→</span>
                <div className="timebox">
                  <span>{t.to}</span>
                  <input type="text"
                    placeholder={info.duration ? formatDuration(info.duration) : 'end'}
                    value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <div className="rule" />

          {/* PROGRESS */}
          {dlActive && (
            <div className="progress-wrap">
              {plStatus && (
                <div className="pl-row">
                  <span>Video {plStatus.current} / {plStatus.total}</span>
                  <span>{Math.round(((plStatus.current-1)/plStatus.total)*100)}%</span>
                </div>
              )}
              <div className="pbar"><div className="pfill" style={{ width: `${progress}%` }} /></div>
              <div className="pfoot">
                <span className="pmsg">{statusMsg}</span>
                <button className="cancel-btn" onClick={cancelDownload}>{t.cancel}</button>
              </div>
            </div>
          )}

          {dlErr && <div className="banner error" style={{ margin: '0 0 16px' }}>{dlErr}</div>}

          {!dlActive && (
            <>
              <button className="dl-btn" onClick={startDownload}>
                <DownloadIcon />{dlLabel()}
              </button>
              {dlDone && (
                <button className="new-dl-btn" onClick={startNew}>
                  <PlusIcon />{lang === 'de' ? 'Neuen Download starten' : 'Start new download'}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ── History ── */}
      {history.length > 0 && (
        <div className="history">
          <div className="history-head">
            <span>{t.recentDl}</span>
            <button onClick={clearHistory}>{t.clearBtn}</button>
          </div>
          {history.map((item, i) => (
            <button key={i} className="h-item" onClick={() => { setUrl(item.url || ''); setInfo(null) }}>
              {item.thumbnail
                ? <img src={item.thumbnail} alt="" />
                : <div className="h-img-ph"><ListIcon /></div>
              }
              <div>
                <p>{item.title}</p>
                <span>
                  {item.isPlaylist ? `Playlist · ${item.count}` : item.type === 'audio' ? (item.audioFmt || 'mp3').toUpperCase() : `${item.quality}p MP4`}
                  {' · '}{timeAgo(item.ts, lang)}
                </span>
              </div>
              <RefreshIcon />
            </button>
          ))}
        </div>
      )}

      <footer>
        {t.footer} ·{' '}
        {!isPro
          ? <button className="footer-pro-link" onClick={() => setShowPricing(true)}>{t.footerPro}</button>
          : <span className="footer-pro-active">{t.proActive}</span>
        }
      </footer>
    </div>
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────
function YTLogo({ size = 26 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="#e63535">
      <path d="M23 7s-.3-2-1.2-2.8c-1.1-1.2-2.4-1.2-3-1.3C16.1 2.8 12 2.8 12 2.8s-4.1 0-6.8.1c-.6.1-1.9.1-3 1.3C1.3 5 1 7 1 7S.7 9.2.7 11.4v2.1c0 2.2.3 4.4.3 4.4s.3 2 1.2 2.8c1.1 1.2 2.6 1.1 3.3 1.2C7.2 22 12 22 12 22s4.1 0 6.8-.2c.6-.1 1.9-.1 3-1.3.9-.8 1.2-2.8 1.2-2.8s.3-2.2.3-4.4v-2.1C23.3 9.2 23 7 23 7zM9.7 15.5V8.4l8.1 3.6-8.1 3.5z"/>
    </svg>
  )
}
const VideoIcon     = () => <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor"><path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/></svg>
const MusicIcon     = () => <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>
const DownloadIcon  = () => <svg viewBox="0 0 24 24" width={19} height={19} fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
const ClipboardIcon = () => <svg viewBox="0 0 24 24" width={17} height={17} fill="currentColor"><path d="M19 2h-4.18C14.4.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5a2 2 0 00-2 2v16a2 2 0 002 2h14a2 2 0 002-2V4a2 2 0 00-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z"/></svg>
const XIcon         = () => <svg viewBox="0 0 24 24" width={17} height={17} fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
const ListIcon      = () => <svg viewBox="0 0 24 24" width={13} height={13} fill="currentColor"><path d="M3 5h2V3c-1.1 0-2 .9-2 2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zM3 9h2V7H3v2zm10-6h-2v2h2V3zm6 0v2h2c0-1.1-.9-2-2-2zM5 21v-2H3c0 1.1.9 2 2 2zm-2-4h2v-2H3v2zM9 3H7v2h2V3zm2 18h2v-2h-2v2zm8-8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zm0-12h2V7h-2v2zm0 8h2v-2h-2v2zm-4 4h2v-2h-2v2zm0-16h2V3h-2v2zM8 17h7v-2H8v2zm0-4h7v-2H8v2zm0-4h7V7H8v2z"/></svg>
const InfoIcon      = () => <svg viewBox="0 0 24 24" width={15} height={15} fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
const RefreshIcon   = () => <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12a9 9 0 109-9M3 3v6h6"/></svg>
const CheckIcon     = () => <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
const LockIcon      = () => <svg viewBox="0 0 24 24" width={15} height={15} fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
const GlobeIcon     = () => <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
const TikTokIcon    = () => <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.84 1.55V6.79a4.85 4.85 0 01-1.07-.1z"/></svg>
const BoltIcon      = () => <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
const ScissorsIcon  = () => <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor"><path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3h-3z"/></svg>
const UserIcon      = () => <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
const InfinityIcon  = () => <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M18.6 6.62c-1.44 0-2.8.56-3.77 1.53L12 10.66 10.48 12h.01L7.8 14.39c-.64.64-1.49.99-2.4.99-1.87 0-3.39-1.52-3.39-3.38S3.53 8.62 5.4 8.62c.91 0 1.76.35 2.44 1.03l1.13 1 1.51-1.34L9.22 8.2C8.2 7.18 6.84 6.62 5.4 6.62 2.42 6.62 0 9.04 0 12s2.42 5.38 5.4 5.38c1.44 0 2.8-.56 3.77-1.53l2.83-2.5.01.01L13.52 12h-.01l2.69-2.39c.64-.64 1.49-.99 2.4-.99 1.87 0 3.39 1.52 3.39 3.38s-1.52 3.38-3.39 3.38c-.9 0-1.76-.35-2.44-1.03l-1.14-1.01-1.51 1.34 1.27 1.12c1.02 1.01 2.37 1.57 3.82 1.57 2.98 0 5.4-2.41 5.4-5.38s-2.42-5.37-5.4-5.37z"/></svg>
const CardIcon      = () => <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
const PlusIcon      = () => <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
function Dots({ white } = {}) {
  return (
    <span className="dots">
      <span style={white ? { background: '#fff' } : {}} />
      <span style={white ? { background: '#fff' } : {}} />
      <span style={white ? { background: '#fff' } : {}} />
    </span>
  )
}
