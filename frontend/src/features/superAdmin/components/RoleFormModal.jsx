import { Button, Card, Chip, Input } from '@heroui/react'
import { useMemo, useState } from 'react'

const normalizeServerIssues = (details) => {
  if (!Array.isArray(details)) return {}
  const byField = {}
  for (const issue of details) {
    const path = Array.isArray(issue.path) ? issue.path : []
    const last = path[path.length - 1]
    if (!last) continue
    if (!byField[last]) byField[last] = issue.message || 'Invalid value'
  }
  return byField
}

const isNonEmpty = (v) => typeof v === 'string' && v.trim().length > 0

function RoleFormModal({ isOpen, mode = 'create', initialRole, isSaving, error, onClose, onSubmit }) {
  const [code, setCode] = useState(() => initialRole?.code || '')
  const [name, setName] = useState(() => initialRole?.name || '')
  const [description, setDescription] = useState(() => initialRole?.description || '')
  const [isActive, setIsActive] = useState(() => initialRole?.isActive ?? true)
  const [touched, setTouched] = useState(false)

  const fieldErrors = useMemo(() => {
    const next = {}
    if (touched && mode === 'create' && !isNonEmpty(code)) next.code = 'Code is required'
    if (touched && mode === 'create' && isNonEmpty(code) && !/^[a-z0-9_]+$/i.test(code.trim())) {
      next.code = 'Code must be alphanumeric and may include _'
    }
    if (touched && (name || '').trim().length < 2) next.name = 'Name must be at least 2 characters'
    return next
  }, [touched, code, name, mode])

  const serverFieldErrors = useMemo(() => normalizeServerIssues(error?.details), [error?.details])
  const topError = error?.message ? error.message : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (Object.keys(fieldErrors).length) return

    const payload =
      mode === 'create'
        ? {
            code: code.trim(),
            name: name.trim(),
            description: isNonEmpty(description) ? description.trim() : undefined,
            isActive,
          }
        : {
            name: name.trim(),
            description: isNonEmpty(description) ? description.trim() : null,
            isActive,
          }

    await onSubmit?.(payload)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-1.5 sm:p-3 md:items-center md:px-3 md:py-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <Card className="glass relative flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] sm:max-h-[calc(100dvh-1.5rem)]">
        <Card.Header className="px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5">
          <div className="min-w-0 flex-1">
            <Chip className="bg-[#e8f4ef] text-[#1f5f50]" variant="flat">
              Super Admin
            </Chip>
            <p className="mt-2 text-xl font-semibold">{mode === 'create' ? 'Create a role' : 'Update role'}</p>
            <p className="muted mt-1 text-sm">
              Roles are shared across companies, so keep the name clear and easy to scan.
            </p>
          </div>
        </Card.Header>

        <Card.Content className="overflow-y-auto px-4 pb-3 pt-0 sm:px-6 sm:pb-6">
          {topError ? (
            <div className="mb-4 rounded-2xl border border-[#cb5f31]/20 bg-[#fce8df] px-4 py-3">
              <p className="text-sm font-medium text-[#9a3e19]">{topError}</p>
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="rounded-2xl border border-black/10 bg-white/55 p-4 space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-black">Role details</p>
                <p className="text-xs text-black/65">
                  The role key is an internal identifier. The display name is what people will read.
                </p>
              </div>

              {mode === 'create' ? (
                <Input
                  label="Role key (internal)"
                  labelPlacement="outside"
                  placeholder="e.g. qa_manager"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  isInvalid={Boolean(fieldErrors.code || serverFieldErrors.code)}
                  errorMessage={fieldErrors.code || serverFieldErrors.code}
                  autoComplete="off"
                />
              ) : (
                <div className="rounded-2xl border border-black/10 bg-white/55 px-4 py-3">
                  <p className="text-xs font-medium text-black/70">Role key</p>
                  <p className="mt-1 font-semibold text-black">{initialRole?.code || '-'}</p>
                </div>
              )}

              <Input
                label="Role name"
                labelPlacement="outside"
                placeholder="e.g. QA Manager"
                value={name}
                onChange={(e) => setName(e.target.value)}
                isInvalid={Boolean(fieldErrors.name || serverFieldErrors.name)}
                errorMessage={fieldErrors.name || serverFieldErrors.name}
              />

              <Input
                label="Description (optional)"
                labelPlacement="outside"
                placeholder="What can this role do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                isInvalid={Boolean(serverFieldErrors.description)}
                errorMessage={serverFieldErrors.description}
              />
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-black">Status</span>
              <select
                className="w-full rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none focus:border-black/20"
                value={isActive ? 'active' : 'inactive'}
                onChange={(e) => setIsActive(e.target.value === 'active')}
                disabled={isSaving}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button className="w-full border border-black/10 bg-white/75 text-black sm:w-auto" type="button" onPress={onClose}>
                Cancel
              </Button>
              <Button className="w-full bg-[#cb5f31] text-white sm:w-auto" type="submit" isLoading={isSaving}>
                {mode === 'create' ? 'Create role' : 'Save role'}
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>
    </div>
  )
}

export default RoleFormModal
