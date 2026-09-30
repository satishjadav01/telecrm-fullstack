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

function CompanyFormModal({ isOpen, mode = 'create', initialCompany = null, isSaving, error, onClose, onSubmit }) {
  const [name, setName] = useState(() => initialCompany?.name || '')
  const [code, setCode] = useState(() => initialCompany?.code || '')
  const [isActive, setIsActive] = useState(() => initialCompany?.isActive ?? true)
  const [shopifyAbandonedCartApiUrl, setShopifyAbandonedCartApiUrl] = useState(
    () => initialCompany?.shopifyAbandonedCartApiUrl || '',
  )
  const [touched, setTouched] = useState(false)

  const fieldErrors = useMemo(() => {
    const next = {}

    if (touched && (name || '').trim().length < 2) {
      next.name = 'Company name must be at least 2 characters'
    }

    if (touched && isNonEmpty(code) && !/^[a-z0-9_-]+$/i.test(code.trim())) {
      next.code = 'Code must be alphanumeric and may include _ or -'
    }

    return next
  }, [touched, name, code])

  const serverFieldErrors = useMemo(() => {
    return normalizeServerIssues(error?.details)
  }, [error?.details])

  const topError = error?.message ? error.message : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (Object.keys(fieldErrors).length) return

    const payload = {
      name: name.trim(),
      code: isNonEmpty(code) ? code.trim() : undefined,
      shopifyAbandonedCartApiUrl: isNonEmpty(shopifyAbandonedCartApiUrl) ? shopifyAbandonedCartApiUrl.trim() : undefined,
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
            <p className="mt-2 text-xl font-semibold">
              {mode === 'edit' ? 'Update company' : 'Add a company'}
            </p>
            <p className="muted mt-1 text-sm">
              {mode === 'edit'
                ? 'Change the company name, code, status, or integrations.'
                : 'Create a new workspace for a company and set up its basics.'}
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
                <p className="text-sm font-semibold text-black">Company details</p>
                <p className="text-xs text-black/65">
                  Use a clear company name. The code is a short internal key used in links and lookups.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Company name"
                  labelPlacement="outside"
                  placeholder="e.g. Default Company"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  isInvalid={Boolean(fieldErrors.name || serverFieldErrors.name)}
                  errorMessage={fieldErrors.name || serverFieldErrors.name}
                  autoComplete="organization"
                  className="w-full"
                />

                <Input
                  label="Company code (optional)"
                  labelPlacement="outside"
                  description="Leave blank to auto-generate a short code from the company name."
                  placeholder="e.g. default-company"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  isInvalid={Boolean(fieldErrors.code || serverFieldErrors.code)}
                  errorMessage={fieldErrors.code || serverFieldErrors.code}
                  autoComplete="off"
                  className="w-full"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/55 p-4 space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-black">Status and integration</p>
                <p className="text-xs text-black/65">
                  Status controls whether the company is active. Integration settings are optional.
                </p>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-black">Status</span>
                <select
                  className="w-full rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none focus:border-black/20"
                  value={isActive ? 'active' : 'inactive'}
                  onChange={(e) => setIsActive(e.target.value === 'active')}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <Input
                label="Shopify abandoned cart URL"
                labelPlacement="outside"
                placeholder="https://..."
                value={shopifyAbandonedCartApiUrl}
                onChange={(e) => setShopifyAbandonedCartApiUrl(e.target.value)}
                description="Paste the full endpoint used to fetch abandoned checkouts."
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                className="w-full border border-black/10 bg-white/75 text-black sm:w-auto"
                type="button"
                onPress={onClose}
                isDisabled={isSaving}
              >
                Cancel
              </Button>
              <Button className="w-full bg-[#cb5f31] text-white sm:w-auto" type="submit" isLoading={isSaving}>
                {mode === 'edit' ? 'Update company' : 'Create company'}
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>
    </div>
  )
}

export default CompanyFormModal
