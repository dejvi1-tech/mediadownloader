require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const express  = require('express')
const cors     = require('cors')
const { spawn, execSync } = require('child_process')
const path     = require('path')
const fs       = require('fs')
const crypto   = require('crypto')

process.env.PATH = `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/root/.local/bin:${process.env.PATH}`

function findBin(name) {
  try { return execSync(`which ${name}`, { env: process.env }).toString().trim() }
  catch { return null }
}
const YTDLP  = findBin('yt-dlp') || 'yt-dlp'
const FFMPEG = findBin('ffmpeg')  || null

// ── YouTube cookies (bypass bot detection on server IPs) ──────────────────────
const COOKIES_FILE = '/tmp/yt-cookies.txt'
let ytCookies = false
if (process.env.YOUTUBE_COOKIES_B64) {
  try {
    const decoded = Buffer.from(process.env.YOUTUBE_COOKIES_B64, 'base64').toString('utf8')
    console.log(`  cookie decode: ${decoded.length} chars, starts with: ${decoded.slice(0,30).replace(/\n/g,'\\n')}`)
    fs.writeFileSync(COOKIES_FILE, decoded)
    ytCookies = true
    console.log(`  cookie file written to ${COOKIES_FILE}`)
  } catch (e) { console.error('  Failed to write YouTube cookies:', e.message) }
} else {
  console.log('  YOUTUBE_COOKIES_B64 env var not found')
}

// ── Stripe (optional — configure via server/.env) ────────────────────────────
let stripe = null
if (process.env.STRIPE_SECRET_KEY) {
  try { stripe = require('stripe')(process.env.STRIPE_SECRET_KEY) }
  catch { console.log('  stripe : package missing — run: npm install stripe') }
}

// ── Pro keys persistence ─────────────────────────────────────────────────────
const KEYS_FILE = path.join(__dirname, 'pro-keys.json')
let proKeys = new Set()
try { JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8')).forEach(k => proKeys.add(k)) } catch {}
function saveKeys() { try { fs.writeFileSync(KEYS_FILE, JSON.stringify([...proKeys])) } catch {} }
function generateKey(seed) {
  const secret = process.env.PRO_SECRET || 'mediadownloader_2025'
  const h = crypto.createHmac('sha256', secret).update(seed).digest('hex').toUpperCase()
  return `MDDL-${h.slice(0,4)}-${h.slice(4,8)}-${h.slice(8,12)}`
}

const app  = express()
const PORT = process.env.PORT || 3001
const DOWNLOADS_DIR = path.join(__dirname, '..', 'downloads')
const CLIENT_DIST   = path.join(__dirname, '..', 'client', 'dist')

app.use(cors())
app.use(express.json())

if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true })
fs.readdirSync(DOWNLOADS_DIR).forEach(f => fs.unlink(path.join(DOWNLOADS_DIR, f), () => {}))

// ── Serve built React client in production ───────────────────────────────────
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST))
}

function setupSSE(res) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()
  return (data) => { if (!res.writableEnded) res.write(`data: ${JSON.stringify(data)}\n\n`) }
}

function safeName(str) {
  return (str || '').trim().replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, ' ').substring(0, 100)
}

// ── GET /api/info ──────────────────────────────────────────────────────────
app.get('/api/info', async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'URL is required' })

  let parsedUrl
  try { parsedUrl = new URL(url) } catch {}
  const hasVideoId   = !!parsedUrl?.searchParams?.get('v')
  const hasListParam = !!parsedUrl?.searchParams?.get('list')
  const wantPlaylist = req.query.forcePlaylist === 'true'
  const isYouTube    = url.includes('youtube.com') || url.includes('youtu.be')

  let singleUrl = url
  if (hasVideoId && !wantPlaylist && parsedUrl) {
    const u = new URL(parsedUrl.toString())
    ;['list', 'start_radio', 'index', 'pp', 'playnext'].forEach(p => u.searchParams.delete(p))
    singleUrl = u.toString()
  }

  // Fast path — YouTube oEmbed (~100 ms)
  if (isYouTube && hasVideoId && !wantPlaylist) {
    try {
      const oembed = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(singleUrl)}&format=json`
      ).then(r => { if (!r.ok) throw new Error('oembed failed'); return r.json() })
      return res.json({
        isPlaylist: false,
        title:      oembed.title,
        thumbnail:  oembed.thumbnail_url,
        uploader:   oembed.author_name,
        duration:   null,
        hasPlaylist: hasListParam,
      })
    } catch { /* fall through to yt-dlp */ }
  }

  // Slow path — yt-dlp
  const args = ['--flat-playlist', '-J']
  if (hasVideoId && !wantPlaylist) args.push('--no-playlist')
  if (isYouTube) {
    args.push('--extractor-args', 'youtube:player_client=tv_embedded,ios,web')
    if (ytCookies) args.push('--cookies', COOKIES_FILE)
  }
  args.push(wantPlaylist ? url : singleUrl)

  const proc = spawn(YTDLP, args)
  let stdout = '', stderr = ''
  proc.stdout.on('data', d => { stdout += d.toString() })
  proc.stderr.on('data', d => { stderr += d.toString() })

  proc.on('close', code => {
    if (code !== 0) {
      let msg = 'Failed to fetch info'
      if (stderr.includes('Sign in') || stderr.includes('bot'))
        msg = 'YouTube blocked this request. Try again in a moment or try a different video.'
      else if (stderr.includes('Private')) msg = 'This video is private'
      else if (stderr.includes('not a'))   msg = 'URL not recognized. Paste a valid video or audio link.'
      return res.status(500).json({ error: msg })
    }
    try {
      const info = JSON.parse(stdout)
      if (info._type === 'playlist') {
        const entries = info.entries || []
        res.json({
          isPlaylist: true,
          title:    info.title || 'Playlist',
          uploader: info.uploader || info.channel || '',
          count:    entries.length,
          thumbnail: info.thumbnails?.[0]?.url
            || entries.find(e => e.thumbnails?.length)?.thumbnails[0]?.url
            || null,
        })
      } else {
        res.json({
          isPlaylist: false,
          title:    info.title,
          thumbnail: info.thumbnail,
          duration: info.duration,
          uploader: info.uploader,
          hasPlaylist: hasListParam && hasVideoId,
        })
      }
    } catch { res.status(500).json({ error: 'Failed to parse response' }) }
  })
  proc.on('error', err => {
    if (err.code === 'ENOENT') res.status(500).json({ error: 'yt-dlp not found' })
  })
})

// ── GET /api/download ──────────────────────────────────────────────────────
app.get('/api/download', (req, res) => {
  const { url, type, quality, audioFormat, embedThumb,
          startTime, endTime, customName, isPlaylist, noWatermark } = req.query
  if (!url) { res.status(400).end(); return }

  const send     = setupSSE(res)
  const fileId   = Date.now().toString()
  const playlist = isPlaylist === 'true'
  const isTikTok = url.includes('tiktok.com') || url.includes('vm.tiktok.com')

  let outputTemplate
  if (playlist) {
    const folder = customName ? safeName(customName) : 'playlist'
    outputTemplate = path.join(DOWNLOADS_DIR, `${fileId}_${folder}_%(playlist_index)02d-%(title)s.%(ext)s`)
  } else if (customName && customName.trim()) {
    outputTemplate = path.join(DOWNLOADS_DIR, `${fileId}_${safeName(customName)}.%(ext)s`)
  } else {
    outputTemplate = path.join(DOWNLOADS_DIR, `${fileId}.%(ext)s`)
  }

  const isYouTubeDl = url.includes('youtube.com') || url.includes('youtu.be')
  const args = [url, '-o', outputTemplate, '--newline']
  if (!playlist) args.push('--no-playlist')

  if (isYouTubeDl) {
    args.push('--extractor-args', 'youtube:player_client=tv_embedded,ios,web')
    if (ytCookies) args.push('--cookies', COOKIES_FILE)
  }

  if (noWatermark === 'true' && isTikTok) {
    args.push('--extractor-args', 'tiktok:app_name=trill')
  }

  if (type === 'audio') {
    const fmt = audioFormat || 'mp3'
    args.push('-x', '--audio-format', fmt, '--audio-quality', '0')
    if (embedThumb === 'true' && FFMPEG) args.push('--embed-thumbnail')
  } else {
    const h = quality && quality !== 'best' ? `[height<=${quality}]` : ''
    const fmt = h
      ? `bestvideo${h}+bestaudio/best${h}/bestvideo+bestaudio/best`
      : `bestvideo+bestaudio/best`
    args.push('-f', fmt, '--merge-output-format', 'mp4')
    if (FFMPEG) args.push('--postprocessor-args', 'merger:-c:v copy -c:a aac -movflags +faststart')
  }

  if (!playlist && (startTime || endTime)) {
    args.push('--download-sections', `*${startTime || '0'}-${endTime || 'inf'}`)
    if (FFMPEG) args.push('--force-keyframes-at-cuts')
  }

  if (FFMPEG) args.push('--ffmpeg-location', FFMPEG)

  const proc = spawn(YTDLP, args)
  let errorSent = false

  proc.stdout.on('data', data => {
    for (const line of data.toString().split('\n')) {
      const t = line.trim(); if (!t) continue
      const pl = t.match(/\[download\] Downloading item (\d+) of (\d+)/)
      if (pl) { send({ type: 'playlist_item', current: +pl[1], total: +pl[2] }); continue }
      const pr = t.match(/\[download\]\s+([\d.]+)%\s+of\s+[\S~]+\s+at\s+([\S]+)\s+ETA\s+([\S]+)/)
      if (pr) { send({ type: 'progress', percent: parseFloat(pr[1]), speed: pr[2], eta: pr[3] }); continue }
      if (t.includes('[ExtractAudio]'))   { send({ type: 'status', message: 'Extracting audio...' }); continue }
      if (t.includes('[Merger]'))          { send({ type: 'status', message: 'Merging streams...' }); continue }
      if (t.includes('[EmbedThumbnail]')) { send({ type: 'status', message: 'Embedding thumbnail...' }); continue }
    }
  })

  proc.stderr.on('data', data => {
    const text = data.toString()
    if (text.includes('ERROR:') && !errorSent) {
      errorSent = true
      send({ type: 'error', message: text.replace(/ERROR:\s*/g, '').split('\n')[0].trim() })
    }
  })

  proc.on('close', code => {
    if (errorSent) { res.end(); return }
    if (code !== 0 && code !== null) {
      send({ type: 'error', message: 'Download failed. Check the URL and try again.' })
      res.end(); return
    }
    const files = fs.readdirSync(DOWNLOADS_DIR).filter(f => f.startsWith(fileId))
    if (files.length === 0) { send({ type: 'error', message: 'Output file not found' }); res.end(); return }

    if (playlist && files.length > 1) {
      send({ type: 'status', message: `Zipping ${files.length} files...` })
      const zipId   = fileId + 'z'
      const zipPath = path.join(DOWNLOADS_DIR, `${zipId}.zip`)
      const zipProc = spawn('zip', ['-j', zipPath, ...files.map(f => path.join(DOWNLOADS_DIR, f))])
      zipProc.on('close', c => {
        files.forEach(f => fs.unlink(path.join(DOWNLOADS_DIR, f), () => {}))
        c === 0 ? send({ type: 'done', fileId: zipId }) : send({ type: 'error', message: 'Failed to create zip' })
        res.end()
      })
    } else {
      send({ type: 'done', fileId }); res.end()
    }
  })

  proc.on('error', err => {
    send({ type: 'error', message: err.code === 'ENOENT' ? 'yt-dlp not found' : err.message })
    res.end()
  })

  req.on('close', () => { if (!proc.killed) proc.kill() })
})

// ── GET /api/file/:fileId ──────────────────────────────────────────────────
app.get('/api/file/:fileId', (req, res) => {
  const { fileId } = req.params
  if (!/^[\da-z]+$/.test(fileId)) return res.status(400).json({ error: 'Invalid file ID' })

  const files = fs.readdirSync(DOWNLOADS_DIR).filter(f => f.startsWith(fileId))
  if (files.length === 0) return res.status(404).json({ error: 'File not found' })

  const filePath = path.join(DOWNLOADS_DIR, files[0])
  const ext = path.extname(filePath).slice(1)
  const mime = {
    mp4: 'video/mp4', mp3: 'audio/mpeg', m4a: 'audio/mp4',
    flac: 'audio/flac', wav: 'audio/wav', webm: 'video/webm',
    mkv: 'video/x-matroska', zip: 'application/zip',
  }
  res.setHeader('Content-Type', mime[ext] || 'application/octet-stream')
  res.setHeader('Content-Disposition', `attachment; filename="download.${ext}"`)
  res.setHeader('Content-Length', fs.statSync(filePath).size)

  const stream = fs.createReadStream(filePath)
  stream.pipe(res)
  stream.on('end', () => fs.unlink(filePath, () => {}))
  stream.on('error', () => { if (!res.headersSent) res.status(500).end() })
})

// ── POST /api/checkout ─────────────────────────────────────────────────────
app.post('/api/checkout', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'stripe_not_configured' })
  const { plan } = req.body
  const priceId = plan === 'yearly'
    ? process.env.STRIPE_YEARLY_PRICE_ID
    : process.env.STRIPE_MONTHLY_PRICE_ID
  if (!priceId) return res.status(503).json({ error: 'price_not_configured' })
  const baseUrl = process.env.APP_URL || `http://localhost:${PORT}`
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${baseUrl}/`,
    })
    res.json({ url: session.url })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /api/verify-session ───────────────────────────────────────────────
app.post('/api/verify-session', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'stripe_not_configured' })
  const { sessionId } = req.body
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.payment_status === 'paid') {
      const key = generateKey(session.customer_email || session.id)
      proKeys.add(key)
      saveKeys()
      res.json({ valid: true, key })
    } else {
      res.status(400).json({ error: 'Payment not completed' })
    }
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /api/activate ─────────────────────────────────────────────────────
app.post('/api/activate', (req, res) => {
  const { key } = req.body
  if (!key) return res.status(400).json({ error: 'Key required' })
  if (proKeys.has(key.trim())) {
    res.json({ valid: true })
  } else {
    res.status(400).json({ error: 'Invalid or unknown activation key' })
  }
})

// ── SPA fallback — serve index.html for all non-API routes ──────────────────
if (fs.existsSync(CLIENT_DIST)) {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`\n  Media Downloader  —  http://localhost:${PORT}`)
  console.log(`  yt-dlp  : ${YTDLP}`)
  console.log(`  ffmpeg  : ${FFMPEG || 'NOT FOUND'}`)
  console.log(`  yt cookies: ${ytCookies ? 'loaded ✓' : 'NOT SET (YouTube may be blocked)'}`)
  console.log(`  stripe  : ${stripe ? 'configured' : 'not configured (see server/.env)'}`)
  console.log(`  pro keys: ${proKeys.size} stored\n`)
})
