import { Button, Card, Chip, Input } from '@heroui/react'
import { useMemo, useState } from 'react'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'agent', label: 'Agent' },
]

const normalizeServerIssues = (details) => {
  // Our backend returns Zod issues under `errors`.
  // Each issue includes `path` like ["body","fullName"].
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

function UserFormModal({
  isOpen,
  mode = 'create', // 'create' | 'edit'
  initialUser,
  canEdit,
  isSaving,
  error,
  onClose,
  onSubmit,
}) {
  const [fullName, setFullName] = useState(() => initialUser?.fullName || '')
  const [email, setEmail] = useState(() => initialUser?.email || '')
  const [phone, setPhone] = useState(() => initialUser?.phone || '')
  const [password, setPassword] = useState('')
  const [roleCode, setRoleCode] = useState(() => initialUser?.role?.code || 'agent')
  const [isActive, setIsActive] = useState(() => initialUser?.isActive ?? true)
  const [touched, setTouched] = useState(false)

  const fieldErrors = useMemo(() => {
    const next = {}

    if (touched && (fullName || '').trim().length < 2) {
      next.fullName = 'Full name must be at least 2 characters'
    }

    if (touched && !isNonEmpty(email) && !isNonEmpty(phone)) {
      next.identifier = 'Either email or phone is required'
    }

    if (mode === 'create' && touched && (password || '').length < 6) {
      next.password = 'Password must be at least 6 characters'
    }

    if (touched && !isNonEmpty(roleCode)) {
      next.roleCode = 'Role is required'
    }

    return next
  }, [touched, fullName, email, phone, password, roleCode, mode])

  const serverFieldErrors = useMemo(() => {
    return normalizeServerIssues(error?.details)
  }, [error?.details])

  const topError = error?.message ? error.message : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canEdit) return
    setTouched(true)
    if (Object.keys(fieldErrors).length) return

    const payload =
      mode === 'create'
        ? {
            fullName: fullName.trim(),
            email: isNonEmpty(email) ? email.trim() : undefined,
            phone: isNonEmpty(phone) ? phone.trim() : undefined,
            password,
            roleCode,
            isActive,
          }
        : {
            fullName: fullName.trim(),
            // For update: allow clearing fields by sending null.
            email: isNonEmpty(email) ? email.trim() : null,
            phone: isNonEmpty(phone) ? phone.trim() : null,
            roleCode,
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
          <div className="min-w-0">
            <Chip className="bg-[#e8f4ef] text-[#1f5f50]" variant="flat">
              {mode === 'create' ? 'Create User' : 'Edit User'}
            </Chip>
            <p className="mt-2 text-xl font-semibold">
              {mode === 'create' ? 'Add a team member' : 'Update user details'}
            </p>
            <p className="muted mt-1 text-sm">
              {mode === 'create'
                ? 'Give this person a name, a login method, and the right role.'
                : 'Update contact info, role, and account status in one place.'}
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
                <p className="text-sm font-semibold text-black">Profile details</p>
                <p className="text-xs text-black/65">
                  Start with the person's name and at least one contact method.
                </p>
              </div>

              <Input
                label="Full name"
                placeholder="e.g. Rahul Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                isInvalid={Boolean(fieldErrors.fullName || serverFieldErrors.fullName)}
                errorMessage={fieldErrors.fullName || serverFieldErrors.fullName}
                isDisabled={!canEdit}
                autoComplete="name"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Email (optional)"
                  placeholder="e.g. user@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  isInvalid={Boolean(serverFieldErrors.email)}
                  errorMessage={serverFieldErrors.email}
                  isDisabled={!canEdit}
                  autoComplete="email"
                />
                <Input
                  label="Phone (optional)"
                  placeholder="e.g. 9999999999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  isInvalid={Boolean(serverFieldErrors.phone)}
                  errorMessage={serverFieldErrors.phone}
                  isDisabled={!canEdit}
                  autoComplete="tel"
                />
              </div>

              {fieldErrors.identifier ? (
                <p className="text-sm font-medium text-[#9a3e19]">{fieldErrors.identifier}</p>
              ) : null}
            </div>

            {mode === 'create' ? (
              <div className="rounded-2xl border border-black/10 bg-white/55 p-4 space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-black">Login access</p>
                  <p className="text-xs text-black/65">
                    Set an initial password, then choose which role this user should have.
                  </p>
                </div>

                <Input
                  label="Temporary password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  isInvalid={Boolean(fieldErrors.password || serverFieldErrors.password)}
                  errorMessage={fieldErrors.password || serverFieldErrors.password}
                  isDisabled={!canEdit}
                  autoComplete="new-password"
                />
              </div>
            ) : null}

            <div className="rounded-2xl border border-black/10 bg-white/55 p-4 space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-black">Role and status</p>
                <p className="text-xs text-black/65">
                  Choose what this user can access and whether the account should be active now.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-black">Role</span>
                  <select
                    className="w-full rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none focus:border-black/20"
                    value={roleCode}
                    disabled={!canEdit}
                    onChange={(e) => setRoleCode(e.target.value)}
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.roleCode ? (
                    <span className="mt-1 block text-xs font-medium text-[#9a3e19]">
                      {fieldErrors.roleCode}
                    </span>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-black">Status</span>
                  <select
                    className="w-full rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none focus:border-black/20"
                    value={isActive ? 'active' : 'inactive'}
                    disabled={!canEdit}
                    onChange={(e) => setIsActive(e.target.value === 'active')}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                className="w-full border border-black/10 bg-white/75 text-black sm:w-auto"
                type="button"
                onPress={onClose}
              >
                Cancel
              </Button>
              <Button
                className="w-full bg-[#cb5f31] text-white sm:w-auto"
                type="submit"
                isDisabled={!canEdit}
                isLoading={isSaving}
              >
                {mode === 'create' ? 'Create user' : 'Save changes'}
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>
    </div>
  )
}

export default UserFormModal
export { ROLE_OPTIONS }
