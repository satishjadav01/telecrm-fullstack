import { Button, Checkbox, CheckboxGroup, Input } from '@heroui/react'
import { useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, Save, Shield, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react'
import PageHeader from '../../../components/common/PageHeader'
import { useToast } from '../../../components/common/ToastProvider'
import { rbacApi } from '../api/rbacApi'
import RoleFormModal from '../components/RoleFormModal'
import PermissionFormModal from '../components/PermissionFormModal'

function SuperAdminRbacPage() {
  const toast = useToast()

  const [roleSearch, setRoleSearch] = useState('')
  const [permissionSearch, setPermissionSearch] = useState('')

  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const [activeRoleId, setActiveRoleId] = useState(null)
  const activeRole = useMemo(() => roles.find((r) => r.id === activeRoleId) || null, [roles, activeRoleId])

  const [selectedPermissionIds, setSelectedPermissionIds] = useState([])
  const [savedPermissionIds, setSavedPermissionIds] = useState([])
  const [isSaving, setIsSaving] = useState(false)

  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [roleModalMode, setRoleModalMode] = useState('create')
  const [roleModalRole, setRoleModalRole] = useState(null)
  const [roleModalSaving, setRoleModalSaving] = useState(false)
  const [roleModalError, setRoleModalError] = useState(null)

  const [permissionModalOpen, setPermissionModalOpen] = useState(false)
  const [permissionModalMode, setPermissionModalMode] = useState('create')
  const [permissionModalPermission, setPermissionModalPermission] = useState(null)
  const [permissionModalSaving, setPermissionModalSaving] = useState(false)
  const [permissionModalError, setPermissionModalError] = useState(null)

  const hasUnsaved = useMemo(() => {
    const a = new Set(selectedPermissionIds)
    const b = new Set(savedPermissionIds)
    if (a.size !== b.size) return true
    for (const id of a) if (!b.has(id)) return true
    return false
  }, [selectedPermissionIds, savedPermissionIds])

  const fetchAll = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [rolesResp, permsResp] = await Promise.all([
        rbacApi.listRoles({ page: 1, limit: 200, search: (roleSearch || '').trim() || undefined }),
        rbacApi.listPermissions({ page: 1, limit: 500, search: (permissionSearch || '').trim() || undefined }),
      ])
      const nextRoles = rolesResp.items || []
      const nextPerms = permsResp.items || []

      setRoles(nextRoles)
      setPermissions(nextPerms)

      const stillExists = activeRoleId && nextRoles.some((r) => r.id === activeRoleId)
      if (!stillExists) {
        setActiveRoleId(nextRoles.length ? nextRoles[0].id : null)
      }
    } catch (e) {
      setError(e)
      setRoles([])
      setPermissions([])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRolePermissions = async (roleId) => {
    if (!roleId) return
    try {
      const data = await rbacApi.getRolePermissions(roleId)
      const ids = data.permissionIds || []
      setSelectedPermissionIds(ids)
      setSavedPermissionIds(ids)
    } catch (e) {
      toast.error(e?.message || 'Failed to load role permissions')
      setSelectedPermissionIds([])
      setSavedPermissionIds([])
    }
  }

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!activeRoleId) return
    fetchRolePermissions(activeRoleId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoleId])

  const savePermissions = async () => {
    if (!activeRoleId) return
    setIsSaving(true)
    try {
      const data = await rbacApi.setRolePermissions(activeRoleId, selectedPermissionIds)
      const ids = data.permissionIds || []
      setSelectedPermissionIds(ids)
      setSavedPermissionIds(ids)
      toast.success('Permissions saved')
    } catch (e) {
      toast.error(e?.message || 'Failed to save permissions')
    } finally {
      setIsSaving(false)
    }
  }

  const openCreateRole = () => {
    setRoleModalError(null)
    setRoleModalMode('create')
    setRoleModalRole(null)
    setRoleModalOpen(true)
  }

  const openEditRole = (role) => {
    setRoleModalError(null)
    setRoleModalMode('edit')
    setRoleModalRole(role)
    setRoleModalOpen(true)
  }

  const submitRole = async (payload) => {
    setRoleModalSaving(true)
    setRoleModalError(null)
    try {
      if (roleModalMode === 'create') {
        await rbacApi.createRole(payload)
        toast.success('Role created')
      } else {
        await rbacApi.updateRole(roleModalRole.id, payload)
        toast.success('Role updated')
      }
      setRoleModalOpen(false)
      await fetchAll()
    } catch (e) {
      setRoleModalError(e)
      toast.error(e?.message || 'Failed to save role')
      throw e
    } finally {
      setRoleModalSaving(false)
    }
  }

  const openCreatePermission = () => {
    setPermissionModalError(null)
    setPermissionModalMode('create')
    setPermissionModalPermission(null)
    setPermissionModalOpen(true)
  }

  const openEditPermission = (permission) => {
    setPermissionModalError(null)
    setPermissionModalMode('edit')
    setPermissionModalPermission(permission)
    setPermissionModalOpen(true)
  }

  const submitPermission = async (payload) => {
    setPermissionModalSaving(true)
    setPermissionModalError(null)
    try {
      if (permissionModalMode === 'create') {
        await rbacApi.createPermission(payload)
        toast.success('Permission created')
      } else {
        await rbacApi.updatePermission(permissionModalPermission.id, payload)
        toast.success('Permission updated')
      }
      setPermissionModalOpen(false)
      await fetchAll()
      if (activeRoleId) await fetchRolePermissions(activeRoleId)
    } catch (e) {
      setPermissionModalError(e)
      toast.error(e?.message || 'Failed to save permission')
      throw e
    } finally {
      setPermissionModalSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <PageHeader
          badge="Super Admin"
          title="Access Control (RBAC)"
          description="Use roles for job types and permissions for the actions those jobs can perform."
        />
        
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="rounded-btn border border-tele-border bg-white text-gray-700 hover:bg-gray-50 font-medium px-4 h-10 shadow-sm"
            startContent={<RefreshCw size={16} />}
            onPress={() => fetchAll()}
            isDisabled={isLoading}
          >
            Reload All
          </Button>
          <Button
            className="rounded-btn border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium px-4 h-10 shadow-sm"
            startContent={<KeyRound size={16} />}
            onPress={openCreatePermission}
          >
            New Permission
          </Button>
          <Button
            className="rounded-btn bg-tele-primary text-white hover:bg-tele-secondary font-medium px-4 h-10 shadow-sm shadow-tele-primary/20"
            startContent={<Shield size={16} />}
            onPress={openCreateRole}
          >
            New Role
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-card border border-tele-border bg-white p-5 flex gap-4 items-start shadow-soft">
           <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
             <Shield size={20} />
           </div>
           <div>
             <h3 className="text-sm font-bold text-tele-dark">1. Roles</h3>
             <p className="text-xs text-gray-500 mt-1 leading-relaxed">
               A role acts as a job type or title (e.g., Admin, Manager, Agent) that is assigned to users.
             </p>
           </div>
        </div>
        <div className="rounded-card border border-tele-border bg-white p-5 flex gap-4 items-start shadow-soft">
           <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
             <KeyRound size={20} />
           </div>
           <div>
             <h3 className="text-sm font-bold text-tele-dark">2. Permissions</h3>
             <p className="text-xs text-gray-500 mt-1 leading-relaxed">
               A granular action that a role is authorized to perform (e.g., Edit Leads, View Reports).
             </p>
           </div>
        </div>
        <div className="rounded-card border border-tele-border bg-white p-5 flex gap-4 items-start shadow-soft">
           <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
             <CheckCircle2 size={20} />
           </div>
           <div>
             <h3 className="text-sm font-bold text-tele-dark">3. Assignment</h3>
             <p className="text-xs text-gray-500 mt-1 leading-relaxed">
               Select a role on the left, then tick the permissions on the right to grant access.
             </p>
           </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-card border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">{error?.message || 'Failed to load RBAC data'}</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr] xl:grid-cols-[350px_1fr]">
        <div className="tele-card flex flex-col h-[600px]">
          <div className="p-5 border-b border-tele-border bg-gray-50 flex flex-col gap-3 rounded-t-[1.5rem]">
            <h2 className="text-sm font-bold text-tele-dark uppercase tracking-wider flex items-center gap-2">
              <Shield size={16} className="text-tele-primary" />
              Roles
            </h2>
            <div className="relative">
              <input
                className="w-full rounded-input border border-tele-border bg-white px-3 py-2 text-sm text-tele-dark outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary"
                placeholder="Search roles..."
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-soft bg-gray-50/30">
            {!isLoading ? (
              roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                    activeRoleId === r.id 
                      ? 'bg-tele-primary text-white border-tele-primary shadow-md' 
                      : 'bg-white border-tele-border text-tele-dark hover:border-tele-primary/30 hover:shadow-sm'
                  }`}
                  onClick={() => setActiveRoleId(r.id)}
                >
                  <div className="flex justify-between items-center mb-1">
                    <p className={`font-bold truncate ${activeRoleId === r.id ? 'text-white' : 'text-tele-dark'}`}>{r.name}</p>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        r.isActive
                          ? activeRoleId === r.id ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : activeRoleId === r.id ? "bg-white/20 text-white" : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {r.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className={`text-xs font-mono truncate ${activeRoleId === r.id ? 'text-white/80' : 'text-gray-500'}`}>{r.code}</p>
                  
                  <div className="mt-2 pt-2 border-t border-white/10 flex justify-end">
                     <span 
                       className={`text-[10px] font-bold uppercase tracking-wider hover:underline cursor-pointer ${activeRoleId === r.id ? 'text-white' : 'text-tele-primary'}`}
                       onClick={(e) => { e.stopPropagation(); openEditRole(r); }}
                     >
                       Edit Role
                     </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="flex justify-center p-8">
                 <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-tele-primary"></div>
              </div>
            )}
            {!isLoading && roles.length === 0 && (
               <div className="text-center p-8 text-gray-500">
                  <p className="text-sm font-medium">No roles found.</p>
               </div>
            )}
          </div>
          
          <div className="p-4 border-t border-tele-border bg-gray-50 rounded-b-[1.5rem]">
             <Button
               className="w-full rounded-btn bg-tele-primary text-white hover:bg-tele-secondary font-medium"
               startContent={<Plus size={16} />}
               onPress={openCreateRole}
             >
               Add New Role
             </Button>
          </div>
        </div>

        <div className="tele-card flex flex-col h-[600px]">
          <div className="p-5 border-b border-tele-border bg-gray-50 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between rounded-t-[1.5rem]">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-tele-dark uppercase tracking-wider flex items-center gap-2">
                <KeyRound size={16} className="text-indigo-600" />
                Role Permissions
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {activeRole ? (
                  <span>Editing access for: <strong className="text-tele-dark ml-1">{activeRole.name}</strong></span>
                ) : (
                  'Select a role on the left'
                )}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative min-w-[200px]">
                <input
                  className="w-full rounded-input border border-tele-border bg-white px-3 py-2 text-sm text-tele-dark outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary"
                  placeholder="Search permissions..."
                  value={permissionSearch}
                  onChange={(e) => setPermissionSearch(e.target.value)}
                />
              </div>
              
              <Button
                className={`rounded-btn font-medium px-6 h-10 ${hasUnsaved ? 'bg-[#cb5f31] text-white hover:bg-[#b04a20] shadow-md' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}
                startContent={<Save size={16} />}
                onPress={savePermissions}
                isDisabled={!activeRoleId || isSaving || !hasUnsaved}
                isLoading={isSaving}
              >
                {hasUnsaved ? 'Save Changes' : 'Saved'}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-soft bg-white rounded-b-[1.5rem]">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100">
               <div className="flex items-center gap-2">
                 <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                   {selectedPermissionIds.length} Permissions Selected
                 </span>
                 {hasUnsaved && (
                   <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                     <AlertCircle size={12} className="mr-1" />
                     Unsaved Changes
                   </span>
                 )}
               </div>
            </div>

            {!activeRoleId ? (
              <div className="flex flex-col items-center justify-center p-12 text-center h-full text-gray-400">
                 <Shield size={48} className="mb-4 text-gray-200" />
                 <p className="text-lg font-bold text-gray-600">No Role Selected</p>
                 <p className="text-sm mt-2">Choose a role from the sidebar to view and edit its permissions.</p>
              </div>
            ) : (
              <CheckboxGroup
                value={selectedPermissionIds}
                onChange={setSelectedPermissionIds}
                className="grid gap-3 sm:grid-cols-2"
              >
                {permissions.map((p) => (
                  <div key={p.id} className={`rounded-xl border p-4 transition-colors ${selectedPermissionIds.includes(p.id) ? 'bg-indigo-50/30 border-indigo-200' : 'bg-white border-tele-border hover:border-indigo-100'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <Checkbox value={p.id} classNames={{ wrapper: "mt-0.5", label: "w-full" }}>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-tele-dark truncate">{p.name}</p>
                          <p className="text-[10px] font-mono text-indigo-600 mt-0.5 truncate">{p.code}</p>
                        </div>
                      </Checkbox>
                      <button
                        type="button"
                        className="text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-tele-primary transition-colors shrink-0"
                        onClick={(e) => { e.preventDefault(); openEditPermission(p); }}
                      >
                        Edit
                      </button>
                    </div>
                    {p.description && <p className="text-xs text-gray-500 mt-3 pl-8 leading-relaxed">{p.description}</p>}
                  </div>
                ))}
              </CheckboxGroup>
            )}
            
            {!isLoading && activeRoleId && permissions.length === 0 && (
              <div className="text-center p-12 text-gray-500">
                 <p className="font-medium">No permissions found matching your search.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <RoleFormModal
        key={`${roleModalOpen ? 'open' : 'closed'}-${roleModalRole?.id || roleModalMode}`}
        isOpen={roleModalOpen}
        mode={roleModalMode}
        initialRole={roleModalRole}
        isSaving={roleModalSaving}
        error={roleModalError}
        onClose={() => (roleModalSaving ? null : setRoleModalOpen(false))}
        onSubmit={submitRole}
      />

      <PermissionFormModal
        key={`${permissionModalOpen ? 'open' : 'closed'}-${permissionModalPermission?.id || permissionModalMode}`}
        isOpen={permissionModalOpen}
        mode={permissionModalMode}
        initialPermission={permissionModalPermission}
        isSaving={permissionModalSaving}
        error={permissionModalError}
        onClose={() => (permissionModalSaving ? null : setPermissionModalOpen(false))}
        onSubmit={submitPermission}
      />
    </section>
  )
}

export default SuperAdminRbacPage
