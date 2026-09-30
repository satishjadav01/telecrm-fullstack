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

function CompanyAdminFormModal({ isOpen, company, isSaving, error, onClose, onSubmit }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [touched, setTouched] = useState(false)

  const fieldErrors = useMemo(() => {
    const next = {}

    if (touched && (fullName || '').trim().length < 2) {
      next.fullName = 'Full name must be at least 2 characters'
    }

    if (touched && !isNonEmpty(email) && !isNonEmpty(phone)) {
      next.identifier = 'Either email or phone is required'
    }

    if (touched && (password || '').length < 6) {
      next.password = 'Password must be at least 6 characters'
    }

    return next
  }, [touched, fullName, email, phone, password])

  const serverFieldErrors = useMemo(() => {
    return normalizeServerIssues(error?.details)
  }, [error?.details])

  const topError = error?.message ? error.message : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (Object.keys(fieldErrors).length) return

    const payload = {
      fullName: fullName.trim(),
      email: isNonEmpty(email) ? email.trim() : undefined,
      phone: isNonEmpty(phone) ? phone.trim() : undefined,
      password,
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
              {company?.name || 'Company'}
            </Chip>
            <p className="mt-2 text-xl font-semibold">Create a company admin</p>
            <p className="muted mt-1 text-sm">
              This person gets admin access inside this company and can sign in right away.
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
                <p className="text-sm font-semibold text-black">Admin details</p>
                <p className="text-xs text-black/65">
                  Enter the name and at least one login method so the admin can access the company.
                </p>
              </div>

              <Input
                label="Full name"
                labelPlacement="outside"
                placeholder="Enter full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                isInvalid={Boolean(fieldErrors.fullName || serverFieldErrors.fullName)}
                errorMessage={fieldErrors.fullName || serverFieldErrors.fullName}
                autoComplete="name"
                className="w-full"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Email (optional)"
                  labelPlacement="outside"
                  placeholder="admin@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  isInvalid={Boolean(serverFieldErrors.email)}
                  errorMessage={serverFieldErrors.email}
                  autoComplete="email"
                  className="w-full"
                />
                <Input
                  label="Phone (optional)"
                  labelPlacement="outside"
                  placeholder="9999999999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  isInvalid={Boolean(serverFieldErrors.phone)}
                  errorMessage={serverFieldErrors.phone}
                  autoComplete="tel"
                  className="w-full"
                />
              </div>

              {fieldErrors.identifier ? (
                <p className="text-sm font-medium text-[#9a3e19]">{fieldErrors.identifier}</p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/55 p-4 space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-black">Login access</p>
                <p className="text-xs text-black/65">
                  Set a temporary password and choose whether the account is active now.
                </p>
              </div>

              <Input
                label="Login password"
                labelPlacement="outside"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                isInvalid={Boolean(fieldErrors.password || serverFieldErrors.password)}
                errorMessage={fieldErrors.password || serverFieldErrors.password}
                autoComplete="new-password"
                className="w-full"
              />

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
                Create admin
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>
    </div>
  )
}

export default CompanyAdminFormModal
