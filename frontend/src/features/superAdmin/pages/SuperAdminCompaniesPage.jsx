import { Button, Input } from '@heroui/react'
import { useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, UserPlus, Building, Briefcase } from 'lucide-react'
import PageHeader from '../../../components/common/PageHeader'
import { useToast } from '../../../components/common/ToastProvider'
import { companiesApi } from '../api/companiesApi'
import CompanyFormModal from '../components/CompanyFormModal'
import CompanyAdminFormModal from '../components/CompanyAdminFormModal'

function SuperAdminCompaniesPage() {
  const toast = useToast()

  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [search, setSearch] = useState('')
  const [isActive, setIsActive] = useState('') // '', 'true', 'false'

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const [createCompanyOpen, setCreateCompanyOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' | 'edit'
  const [isCreatingCompany, setIsCreatingCompany] = useState(false)
  const [createCompanyError, setCreateCompanyError] = useState(null)

  const [createAdminOpen, setCreateAdminOpen] = useState(false)
  const [activeCompany, setActiveCompany] = useState(null)
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false)
  const [createAdminError, setCreateAdminError] = useState(null)

  const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 0) / limit)), [total, limit])

  const fetchCompanies = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await companiesApi.list({
        page,
        limit,
        search: (search || '').trim() || undefined,
        isActive: isActive === '' ? undefined : isActive === 'true',
      })
      setItems(data.items || [])
      setTotal(data.total || 0)
    } catch (e) {
      setError(e)
      setItems([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, isActive])

  const openCreateCompany = () => {
    setModalMode('create')
    setActiveCompany(null)
    setCreateCompanyError(null)
    setCreateCompanyOpen(true)
  }

  const openEditCompany = (company) => {
    setModalMode('edit')
    setActiveCompany(company)
    setCreateCompanyError(null)
    setCreateCompanyOpen(true)
  }

  const closeCreateCompany = () => {
    if (isCreatingCompany) return
    setCreateCompanyOpen(false)
  }

  const openCreateAdmin = (company) => {
    if (company?.hasAdmin) {
      toast.error('This company already has an admin')
      return
    }
    setCreateAdminError(null)
    setActiveCompany(company)
    setCreateAdminOpen(true)
  }

  const closeCreateAdmin = () => {
    if (isCreatingAdmin) return
    setCreateAdminOpen(false)
    setActiveCompany(null)
  }

  const submitCompany = async (payload) => {
    setIsCreatingCompany(true)
    setCreateCompanyError(null)
    try {
      if (modalMode === 'create') {
        await companiesApi.create(payload)
        toast.success('Company created')
      } else {
        await companiesApi.update(activeCompany.id, payload)
        toast.success('Company updated')
      }
      setCreateCompanyOpen(false)
      setActiveCompany(null)
      await fetchCompanies()
    } catch (e) {
      setCreateCompanyError(e)
      toast.error(e?.message || 'Failed to save company')
      throw e
    } finally {
      setIsCreatingCompany(false)
    }
  }

  const submitCreateAdmin = async (payload) => {
    if (!activeCompany?.id) return
    setIsCreatingAdmin(true)
    setCreateAdminError(null)
    try {
      await companiesApi.createAdmin(activeCompany.id, payload)
      toast.success('Company admin created')
      setCreateAdminOpen(false)
      setActiveCompany(null)
    } catch (e) {
      setCreateAdminError(e)
      toast.error(e?.message || 'Failed to create admin')
      throw e
    } finally {
      setIsCreatingAdmin(false)
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        badge="Super Admin"
        title="Companies"
        description="Create companies (firms/tenants) and add one Admin user per company."
      />

      <div className="tele-card">
        <div className="p-6 border-b border-tele-border flex flex-col md:flex-row md:items-end justify-between gap-4 bg-gray-50/50 rounded-t-[1.5rem]">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-tele-dark flex items-center gap-2">
              <Building size={20} className="text-tele-primary" />
              Company List
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Showing <span className="font-bold text-tele-dark">{items.length}</span> of <span className="font-bold text-tele-dark">{total}</span> companies.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <Button
              className="rounded-btn border border-tele-border bg-white text-gray-700 hover:bg-gray-50 transition-colors w-full sm:w-auto font-medium px-4 h-10"
              startContent={<RefreshCw size={16} />}
              onPress={() => fetchCompanies()}
              isDisabled={isLoading}
            >
              Refresh
            </Button>
            <Button
              className="rounded-btn bg-tele-primary text-white hover:bg-tele-secondary transition-colors w-full sm:w-auto font-medium px-5 h-10"
              startContent={<Plus size={16} />}
              onPress={openCreateCompany}
            >
              Create company
            </Button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <label className="block w-full relative">
              <span className="mb-1.5 block text-xs font-medium text-gray-600 uppercase tracking-wider">Search</span>
              <input
                className="w-full rounded-input border border-tele-border bg-gray-50 px-3 h-[42px] text-sm text-tele-dark outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary"
                placeholder="Name or code"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchCompanies()}
              />
            </label>
            <label className="block w-full">
              <span className="mb-1.5 block text-xs font-medium text-gray-600 uppercase tracking-wider">Status</span>
              <select
                className="w-full rounded-input border border-tele-border bg-gray-50 px-3 h-[42px] text-sm text-tele-dark outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary appearance-none cursor-pointer"
                value={isActive}
                onChange={(e) => {
                  setPage(1)
                  setIsActive(e.target.value)
                }}
              >
                <option value="">All statuses</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
            <div className="flex items-end h-[42px] md:h-auto md:mt-[22px]">
              <Button
                className="w-full sm:w-auto rounded-btn border border-tele-border bg-white text-gray-700 hover:bg-gray-50 font-medium px-6 h-full"
                onPress={() => { setPage(1); fetchCompanies() }}
              >
                Apply Filters
              </Button>
            </div>
          </div>

          {error ? (
            <div className="rounded-card border border-red-200 bg-red-50 p-4 mb-4">
              <p className="text-sm font-medium text-red-700">{error?.message || 'Failed to load companies'}</p>
            </div>
          ) : null}

          {isLoading ? (
             <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50/50 rounded-card border border-tele-border">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-tele-primary mb-3"></div>
                <p className="font-medium text-tele-dark">Loading companies...</p>
             </div>
          ) : null}

          {!isLoading && !items.length && !error ? (
             <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50/50 rounded-card border border-tele-border">
                <div className="bg-gray-200 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                   <Building className="text-gray-400" size={24} />
                </div>
                <p className="font-bold text-lg text-tele-dark">No companies found</p>
                <p className="text-gray-500 text-sm mt-2">
                  Try adjusting your search criteria or create a new company.
                </p>
             </div>
          ) : null}

          {/* Desktop: table */}
          {!isLoading && items.length > 0 ? (
            <div className="hidden md:block overflow-x-auto rounded-card border border-tele-border">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-600 border-b border-tele-border">
                  <tr>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider">Company Name</th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider">Tenant Code</th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider">Administrator</th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tele-border bg-white">
                  {items.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4 font-bold text-tele-dark">{c.name}</td>
                      <td className="px-5 py-4 text-gray-600 font-mono text-xs">{c.code}</td>
                      <td className="px-5 py-4">
                        {c.admin ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-tele-dark">{c.admin.fullName}</span>
                            <span className="text-xs text-gray-500 mt-0.5">
                              {c.admin.email || c.admin.phone || 'No identifier'}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                            No Admin
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            c.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <Button
                            className="rounded-btn border border-tele-border bg-white text-gray-700 hover:bg-gray-50 font-medium h-8 px-3 text-xs disabled:opacity-50"
                            startContent={!c.hasAdmin && <UserPlus size={14} />}
                            onPress={() => openCreateAdmin(c)}
                            isDisabled={Boolean(c.hasAdmin)}
                          >
                            Assign Admin
                          </Button>
                          <Button
                            className="rounded-btn border border-tele-border bg-white text-gray-700 hover:bg-gray-50 font-medium h-8 px-3 text-xs"
                            onPress={() => openEditCompany(c)}
                          >
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          
          {/* Mobile: cards */}
          {!isLoading && items.length > 0 ? (
            <div className="grid gap-4 md:hidden">
              {items.map((c) => (
                <div key={c.id} className="rounded-card border border-tele-border bg-white p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-tele-dark">{c.name}</p>
                      <p className="text-gray-500 mt-1 truncate text-xs font-mono">{c.code}</p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        c.isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Briefcase size={14} className="text-gray-400" />
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Administrator</span>
                    </div>
                    {c.admin ? (
                      <div>
                        <p className="text-sm font-bold text-tele-dark">{c.admin.fullName || '-'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {c.admin.email || c.admin.phone || 'No identifier'}
                        </p>
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 mt-1">
                        Unassigned
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Button
                      className="w-full rounded-btn border border-tele-border bg-white text-gray-700 hover:bg-gray-50 font-medium h-9 text-sm disabled:opacity-50"
                      startContent={<UserPlus size={14} />}
                      onPress={() => openCreateAdmin(c)}
                      isDisabled={Boolean(c.hasAdmin)}
                    >
                      Assign Admin
                    </Button>
                    <Button
                      className="w-full rounded-btn border border-tele-border bg-white text-gray-700 hover:bg-gray-50 font-medium h-9 text-sm"
                      onPress={() => openEditCompany(c)}
                    >
                      Edit Company
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {!isLoading && items.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-tele-border">
              <p className="text-sm text-gray-500">
                Page <span className="font-bold text-tele-dark">{page}</span> of <span className="font-bold text-tele-dark">{totalPages}</span>
              </p>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  className="flex-1 sm:flex-none rounded-btn border border-tele-border bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 h-9 px-4 text-sm font-medium transition-colors"
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  isDisabled={page <= 1 || isLoading}
                >
                  Previous
                </Button>
                <Button
                  className="flex-1 sm:flex-none rounded-btn border border-tele-border bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 h-9 px-4 text-sm font-medium transition-colors"
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  isDisabled={page >= totalPages || isLoading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <CompanyFormModal
        key={`${createCompanyOpen ? 'open' : 'closed'}-${activeCompany?.id || modalMode}`}
        isOpen={createCompanyOpen}
        mode={modalMode}
        initialCompany={activeCompany}
        isSaving={isCreatingCompany}
        error={createCompanyError}
        onClose={closeCreateCompany}
        onSubmit={submitCompany}
      />

      <CompanyAdminFormModal
        key={`${createAdminOpen ? 'open' : 'closed'}-${activeCompany?.id || 'new'}`}
        isOpen={createAdminOpen}
        company={activeCompany}
        isSaving={isCreatingAdmin}
        error={createAdminError}
        onClose={closeCreateAdmin}
        onSubmit={submitCreateAdmin}
      />
    </section>
  )
}

export default SuperAdminCompaniesPage
