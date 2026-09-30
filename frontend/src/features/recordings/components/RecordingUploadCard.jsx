import { Button, Card, Chip, Input } from '@heroui/react'
import { useMemo, useRef, useState } from 'react'
import { Upload } from 'lucide-react'

const prettyBytes = (bytes) => {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)))
  const value = n / 1024 ** i
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

function RecordingUploadCard({ canUpload, activeCallId, onUpload }) {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [consentCaptured, setConsentCaptured] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const disabledReason = useMemo(() => {
    if (!canUpload) return 'You do not have permission to upload.'
    if (!activeCallId) return 'Start a call first to attach a recording.'
    return null
  }, [canUpload, activeCallId])

  const pick = () => inputRef.current?.click()

  const submit = async () => {
    setError(null)
    setSuccess(null)
    if (disabledReason) return
    if (!file) {
      setError('Please choose a recording file first.')
      return
    }

    setIsUploading(true)
    try {
      await onUpload?.(file, { consentCaptured })
      setSuccess('Recording uploaded.')
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (e) {
      setError(e?.message || 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card className="rounded-2xl border border-black/10 bg-white/60">
      <Card.Header className="justify-between">
        <div>
          <p className="text-sm font-semibold">Upload call recording</p>
          <p className="muted mt-1 text-xs">
            Field name: <span className="font-medium text-black">recording</span> (multipart/form-data)
          </p>
        </div>
        <Chip className="bg-[#e8f4ef] text-[#1f5f50]" variant="flat">
          Max 50 MB
        </Chip>
      </Card.Header>
      <Card.Content className="space-y-3">
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            className="border border-black/10 bg-white/75 text-black"
            startContent={<Upload size={16} />}
            onPress={pick}
            isDisabled={Boolean(disabledReason) || isUploading}
          >
            Choose file
          </Button>
          <p className="muted text-sm">
            {file ? (
              <>
                <span className="font-medium text-black">{file.name}</span> ({prettyBytes(file.size)})
              </>
            ) : (
              'No file selected'
            )}
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={consentCaptured}
            disabled={Boolean(disabledReason) || isUploading}
            onChange={(e) => setConsentCaptured(e.target.checked)}
          />
          Consent captured
        </label>

        {disabledReason ? (
          <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2">
            <p className="muted text-sm">{disabledReason}</p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-[#cb5f31]/20 bg-[#fce8df] px-3 py-2">
            <p className="text-sm font-medium text-[#9a3e19]">{error}</p>
          </div>
        ) : null}

        {success ? (
          <div className="rounded-xl border border-black/10 bg-[#e7f4ee] px-3 py-2">
            <p className="text-sm font-medium text-[#1d5f4d]">{success}</p>
          </div>
        ) : null}

        <Button
          className="w-full bg-[#cb5f31] text-white"
          onPress={submit}
          isDisabled={Boolean(disabledReason) || isUploading}
          isLoading={isUploading}
        >
          Upload
        </Button>
      </Card.Content>
    </Card>
  )
}

export default RecordingUploadCard

