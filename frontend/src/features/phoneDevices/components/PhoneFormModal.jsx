import { Button, Card, Input, Chip } from '@heroui/react'

function PhoneFormModal({ 
  isOpen, 
  onClose, 
  onSave, 
  isSaving, 
  form, 
  setForm, 
  activePhone, 
  agentAssignees 
}) {
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
              {activePhone ? 'Edit Device' : 'Register Device'}
            </Chip>
            <p className="mt-2 text-xl font-semibold">
              {activePhone ? 'Update Handset' : 'Add New Handset'}
            </p>
            <p className="muted mt-1 text-sm">
              {activePhone 
                ? 'Update device details or reassign the agent.'
                : 'Enter device identifiers and assign to an agent.'}
            </p>
          </div>
        </Card.Header>

        <Card.Content className="overflow-y-auto px-4 pb-3 pt-0 sm:px-6 sm:pb-6">
          <div className="space-y-4">
            <Input
              label="Phone label"
              placeholder="Samsung A14 - Floor 2"
              value={form.label}
              onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
            />
            
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="IMEI"
                placeholder="Enter device IMEI"
                value={form.imei}
                onChange={(e) => setForm((prev) => ({ ...prev, imei: e.target.value }))}
              />
              <Input
                label="Phone number"
                placeholder="SIM phone number"
                value={form.phoneNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Manufacturer"
                placeholder="Samsung"
                value={form.manufacturer}
                onChange={(e) => setForm((prev) => ({ ...prev, manufacturer: e.target.value }))}
              />
              <Input
                label="Model"
                placeholder="Galaxy A14"
                value={form.model}
                onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
              />
            </div>

            <Input
              label="SIM serial / number"
              placeholder="Optional SIM identifier"
              value={form.simNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, simNumber: e.target.value }))}
            />

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-black">Assign to agent</span>
              <select
                className="w-full rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none focus:border-black/20"
                value={form.assignedToUserId}
                onChange={(e) => setForm((prev) => ({ ...prev, assignedToUserId: e.target.value }))}
              >
                <option value="">Unassigned</option>
                {agentAssignees.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.fullName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-black">Notes</span>
              <textarea
                className="min-h-24 w-full rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none focus:border-black/20"
                placeholder="Extra notes about the handset..."
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </label>

            <label className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white/70 px-3 py-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              />
              <span className="text-sm font-medium text-black">Device is active</span>
            </label>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button 
                variant="flat" 
                className="w-full border border-black/10 bg-white/75 text-black sm:w-auto"
                onPress={onClose}
              >
                Cancel
              </Button>
              <Button 
                className="w-full bg-[#1f5f50] text-white sm:w-auto" 
                onPress={onSave}
                isLoading={isSaving}
                isDisabled={!form.label.trim() || !form.imei.trim()}
              >
                {activePhone ? 'Update Device' : 'Register Device'}
              </Button>
            </div>
          </div>
        </Card.Content>
      </Card>
    </div>
  )
}

export default PhoneFormModal
