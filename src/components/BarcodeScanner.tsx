import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { NotFoundException } from '@zxing/library'

interface Props {
  onDetected: (barcode: string) => void
  onCancel: () => void
}

export default function BarcodeScanner({ onDetected, onCancel }: Props) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState(t('scan.aim'))
  const detectedRef = useRef(false)

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
    readerRef.current = null
  }, [])

  useEffect(() => {
    let cancelled = false

    async function startScanner() {
      if (!videoRef.current) return
      try {
        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader

        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result, err) => {
            if (cancelled || detectedRef.current) return
            if (result) {
              detectedRef.current = true
              setHint(t('scan.detected'))
              stopScanner()
              onDetected(result.getText())
            } else if (err && !(err instanceof NotFoundException)) {
              console.warn('ZXing error:', err)
            }
          },
        )

        if (!cancelled) {
          controlsRef.current = controls
        } else {
          controls.stop()
        }
      } catch (err: unknown) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
          setError(t('scan.permissionDenied'))
        } else if (
          msg.toLowerCase().includes('device') ||
          msg.toLowerCase().includes('found')
        ) {
          setError(t('scan.notSupported'))
        } else {
          setError(t('scan.error'))
        }
      }
    }

    startScanner()

    return () => {
      cancelled = true
      stopScanner()
    }
  }, [onDetected, stopScanner, t])

  const handleCancel = () => {
    stopScanner()
    onCancel()
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 text-center p-6" data-testid="scanner-error">
        <div className="text-5xl">📵</div>
        <p className="text-red-400">{error}</p>
        <button
          onClick={handleCancel}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-medium transition-colors"
        >
          {t('scan.stop')}
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-4" data-testid="barcode-scanner">
      {/* Camera view */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-black border-2 border-blue-500/40">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
          data-testid="scanner-video"
        />

        {/* Scanning overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Dim overlay with cutout effect */}
          <div className="absolute inset-0 bg-slate-900/40" />

          {/* Scan window */}
          <div className="relative w-4/5 h-2/5 border-2 border-blue-400 rounded-lg z-10">
            {/* Corner guides */}
            <span className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl" />
            <span className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr" />
            <span className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl" />
            <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br" />

            {/* Animated scan line */}
            <div className="absolute inset-x-0 h-0.5 bg-blue-400/80 scan-line rounded" />
          </div>
        </div>
      </div>

      {/* Hint text */}
      <p className="text-center text-slate-300 text-sm">{hint}</p>

      {/* Cancel button */}
      <button
        onClick={handleCancel}
        className="px-6 py-3 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 rounded-xl text-white font-medium transition-colors"
        data-testid="scanner-stop"
      >
        {t('scan.stop')}
      </button>
    </div>
  )
}
