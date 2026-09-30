import { Button, Input } from "@heroui/react";
import PageHeader from "../../../components/common/PageHeader";
import { useAuth } from "../../auth/context/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { usersApi } from "../../users/api/usersApi";
import UserFormModal, {
  ROLE_OPTIONS,
} from "../../users/components/UserFormModal";
import { Plus, RefreshCw, ShoppingCart, Globe, Key, Save, Users, Smartphone, Store, ShieldCheck } from "lucide-react";
import { useToast } from "../../../components/common/ToastProvider";
import { phoneDevicesApi } from "../../phoneDevices/api/phoneDevicesApi";
import PhoneFormModal from "../../phoneDevices/components/PhoneFormModal";
import { adminApi } from "../api/adminApi";

function AdminSetupPage() {
  const auth = useAuth();
  const canEdit = Boolean(auth.isAuthenticated);
  const toast = useToast();
  const company = auth.user?.company || null;
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "users");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [roleCode, setRoleCode] = useState("");
  const [isActive, setIsActive] = useState(""); // '', 'true', 'false'
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' | 'edit'
  const [activeUser, setActiveUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [agents, setAgents] = useState([]);
  const [phoneDevices, setPhoneDevices] = useState([]);
  const [isLoadingPhones, setIsLoadingPhones] = useState(true);
  const [phonesError, setPhonesError] = useState(null);
  const [activePhoneId, setActivePhoneId] = useState("");
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phoneForm, setPhoneForm] = useState({
    isActive: true,
  });
  const [shopifyForm, setShopifyForm] = useState({
    shopifyAbandonedCartApiUrl: "",
  });
  const [isSavingShopify, setIsSavingShopify] = useState(false);
  const [isLoadingShopify, setIsLoadingShopify] = useState(false);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil((total || 0) / limit));
  }, [total, limit]);

  const filteredItems = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return items;
    return items.filter((u) => {
      return (
        (u.fullName || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.phone || "").toLowerCase().includes(q) ||
        (u.role?.code || "").toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  const agentAssignees = useMemo(() => {
    return agents.filter(
      (user) => (user?.role?.code || "").toLowerCase() === "agent",
    );
  }, [agents]);

  const activePhone = useMemo(() => {
    return phoneDevices.find((phone) => phone.id === activePhoneId) || null;
  }, [phoneDevices, activePhoneId]);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await usersApi.list({
        page,
        limit,
        roleCode: roleCode || undefined,
        isActive: isActive === "" ? undefined : isActive === "true",
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e);
      setItems([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const data = await usersApi.list({
        page: 1,
        limit: 100,
        roleCode: "agent",
        isActive: true,
      });
      setAgents(data.items || []);
    } catch {
      setAgents([]);
    }
  };
  const fetchPhoneDevices = async () => {
    setIsLoadingPhones(true);
    setPhonesError(null);
    try {
      const data = await phoneDevicesApi.list({ page: 1, limit: 100 });
      setPhoneDevices(data.items || []);
    } catch (e) {
      setPhoneDevices([]);
      setPhonesError(e);
    } finally {
      setIsLoadingPhones(false);
    }
  };

  const fetchShopifySettings = async () => {
    setIsLoadingShopify(true);
    try {
      const data = await adminApi.getMyCompany();
      setShopifyForm({
        shopifyAbandonedCartApiUrl: data.shopifyAbandonedCartApiUrl || "",
      });
    } catch (e) {
      toast.error("Failed to load Shopify settings");
    } finally {
      setIsLoadingShopify(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users") fetchUsers();
    if (activeTab === "phones") fetchPhoneDevices();
    if (activeTab === "shopify") fetchShopifySettings();
  }, [activeTab, page, roleCode, isActive]);

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    if (!phoneDevices.length) {
      setActivePhoneId("");
      return;
    }
    if (!phoneDevices.some((phone) => phone.id === activePhoneId)) {
      setActivePhoneId(phoneDevices[0].id);
    }
  }, [phoneDevices, activePhoneId]);

  const openCreate = () => {
    setSaveError(null);
    setModalMode("create");
    setActiveUser(null);
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setSaveError(null);
    setModalMode("edit");
    setActiveUser(user);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setModalOpen(false);
  };

  const resetPhoneForm = (open = true) => {
    setActivePhoneId("");
    setPhoneForm({
      label: "",
      imei: "",
      phoneNumber: "",
      manufacturer: "",
      model: "",
      simNumber: "",
      assignedToUserId: "",
      notes: "",
      isActive: true,
    });
    if (open) setIsPhoneModalOpen(true);
  };

  const openPhoneForEdit = (phone) => {
    setActivePhoneId(phone.id);
    setPhoneForm({
      label: phone.label || "",
      imei: phone.imei || "",
      phoneNumber: phone.phoneNumber || "",
      manufacturer: phone.manufacturer || "",
      model: phone.model || "",
      simNumber: phone.simNumber || "",
      assignedToUserId: phone.assignee?.id || "",
      notes: phone.notes || "",
      isActive: phone.isActive ?? true,
    });
    setIsPhoneModalOpen(true);
  };

  const onSubmit = async (payload) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (modalMode === "create") {
        await usersApi.create(payload);
        toast.success("User created");
      } else {
        await usersApi.update(activeUser.id, payload);
        toast.success("User updated");
      }
      setModalOpen(false);
      await fetchUsers();
    } catch (e) {
      setSaveError(e);
      toast.error(e?.message || "Failed to save user");
      throw e;
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmitPhone = async () => {
    setIsSavingPhone(true);
    try {
      const payload = {
        ...phoneForm,
        assignedToUserId: phoneForm.assignedToUserId || null,
      };
      if (activePhone) {
        await phoneDevicesApi.update(activePhone.id, payload);
        toast.success("Phone updated");
      } else {
        await phoneDevicesApi.create(payload);
        toast.success("Phone added");
      }
      resetPhoneForm(false);
      setIsPhoneModalOpen(false);
      await fetchPhoneDevices();
    } catch (e) {
      toast.error(e?.message || "Failed to save phone");
    } finally {
      setIsSavingPhone(false);
    }
  };
  const onSaveShopify = async (e) => {
    e?.preventDefault();
    setIsSavingShopify(true);
    try {
      await adminApi.updateMyCompany(shopifyForm);
      toast.success("Shopify settings updated");
    } catch (e) {
      toast.error(e?.message || "Failed to save Shopify settings");
    } finally {
      setIsSavingShopify(false);
    }
  };
  
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <PageHeader
          badge="System Setup"
          title="Admin Control Panel"
          description="Manage users and phone devices for your company."
        />
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3 py-1.5 bg-white border border-tele-border rounded-lg shadow-sm flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</span>
            <span className="text-sm font-bold text-tele-dark">{company?.name || company?.code || "—"}</span>
          </div>
          {company?.code && (
            <div className="px-3 py-1.5 bg-tele-light/30 border border-tele-light rounded-lg shadow-sm flex items-center gap-2">
              <span className="text-xs font-semibold text-tele-primary uppercase tracking-wider">Code</span>
              <span className="text-sm font-bold text-tele-primary">{company.code}</span>
            </div>
          )}
        </div>
      </div>

      <div className="tele-card">
        {/* Custom Tabs */}
        <div className="border-b border-tele-border px-6 pt-6">
           <div className="flex overflow-x-auto scrollbar-hide space-x-2">
              <button 
                onClick={() => handleTabChange('users')}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-t-xl transition-colors whitespace-nowrap ${activeTab === 'users' ? 'bg-tele-primary/10 text-tele-primary border-b-2 border-tele-primary' : 'text-gray-500 hover:text-tele-dark hover:bg-gray-50'}`}
              >
                <Users size={16} />
                Users & Roles
              </button>
              <button 
                onClick={() => handleTabChange('phones')}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-t-xl transition-colors whitespace-nowrap ${activeTab === 'phones' ? 'bg-tele-primary/10 text-tele-primary border-b-2 border-tele-primary' : 'text-gray-500 hover:text-tele-dark hover:bg-gray-50'}`}
              >
                <Smartphone size={16} />
                Phone Devices
              </button>
              <button 
                onClick={() => handleTabChange('shopify')}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-t-xl transition-colors whitespace-nowrap ${activeTab === 'shopify' ? 'bg-tele-primary/10 text-tele-primary border-b-2 border-tele-primary' : 'text-gray-500 hover:text-tele-dark hover:bg-gray-50'}`}
              >
                <Store size={16} />
                Shopify Integration
              </button>
           </div>
        </div>

        <div className="p-0">
          {activeTab === "users" && (
            <div>
              <div className="p-6 border-b border-tele-border flex flex-col md:flex-row md:items-end justify-between gap-4 bg-gray-50/50">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-tele-dark flex items-center gap-2">
                    <ShieldCheck size={20} className="text-tele-primary" />
                    User Roster
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Showing <span className="font-bold text-tele-dark">{items.length}</span> of <span className="font-bold text-tele-dark">{total}</span> users.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <Button
                    className="rounded-btn border border-tele-border bg-white text-gray-700 hover:bg-gray-50 transition-colors w-full sm:w-auto font-medium px-4 h-10"
                    startContent={<RefreshCw size={16} />}
                    onPress={() => fetchUsers()}
                    isDisabled={isLoading}
                  >
                    Refresh
                  </Button>
                  <Button
                    className="rounded-btn bg-tele-primary text-white hover:bg-tele-secondary transition-colors w-full sm:w-auto font-medium px-5 h-10"
                    startContent={<Plus size={16} />}
                    onPress={openCreate}
                  >
                    Create user
                  </Button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <label className="block w-full relative">
                    <span className="mb-1.5 block text-xs font-medium text-gray-600 uppercase tracking-wider">Search</span>
                    <input
                      className="w-full rounded-input border border-tele-border bg-gray-50 px-3 h-[42px] text-sm text-tele-dark outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary"
                      placeholder="Name, email, phone, role..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                  <label className="block w-full">
                    <span className="mb-1.5 block text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Role Filter
                    </span>
                    <select
                      className="w-full rounded-input border border-tele-border bg-gray-50 px-3 h-[42px] text-sm text-tele-dark outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary appearance-none cursor-pointer"
                      value={roleCode}
                      onChange={(e) => {
                        setPage(1);
                        setRoleCode(e.target.value);
                      }}
                    >
                      <option value="">All roles</option>
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block w-full">
                    <span className="mb-1.5 block text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Status Filter
                    </span>
                    <select
                      className="w-full rounded-input border border-tele-border bg-gray-50 px-3 h-[42px] text-sm text-tele-dark outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary appearance-none cursor-pointer"
                      value={isActive}
                      onChange={(e) => {
                        setPage(1);
                        setIsActive(e.target.value);
                      }}
                    >
                      <option value="">All statuses</option>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </label>
                </div>

                {error ? (
                  <div className="rounded-card border border-red-200 bg-red-50 p-4 mb-4">
                    <p className="text-sm font-medium text-red-700">
                      {error.message || "Failed to load users"}
                    </p>
                  </div>
                ) : null}

                {isLoading ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50/50 rounded-card border border-tele-border">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-tele-primary mb-3"></div>
                    <p className="font-medium text-tele-dark">Loading users...</p>
                  </div>
                ) : null}

                {!isLoading && !filteredItems.length ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50/50 rounded-card border border-tele-border">
                    <div className="bg-gray-200 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                       <Users className="text-gray-400" size={24} />
                    </div>
                    <p className="font-bold text-lg text-tele-dark">No users found</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Try clearing your search or filters.
                    </p>
                  </div>
                ) : null}

                {!isLoading && filteredItems.length > 0 ? (
                  <div className="overflow-x-auto rounded-card border border-tele-border">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-gray-50 text-gray-600 border-b border-tele-border">
                        <tr>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider">Name</th>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider">Contact</th>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider">Role</th>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider">Assigned Device</th>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider">Status</th>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-tele-border bg-white">
                        {filteredItems.map((u) => (
                          <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-4 font-bold text-tele-dark">{u.fullName}</td>
                            <td className="px-5 py-4">
                              <div className="flex flex-col">
                                <span className="text-tele-dark font-medium">{u.email || "-"}</span>
                                <span className="text-gray-500 text-xs mt-0.5">{u.phone || "-"}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border border-gray-200 bg-gray-50 text-gray-600">
                                {u.role?.name || u.role?.code || "-"}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              {u.phoneDevicesAssigned?.[0] ? (
                                <div className="flex flex-col">
                                  <span className="font-bold text-tele-primary">
                                    {u.phoneDevicesAssigned[0].label}
                                  </span>
                                  <span className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">
                                    IMEI: {u.phoneDevicesAssigned[0].imei}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 italic text-xs">No device</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                  u.isActive
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-red-50 text-red-700 border-red-200"
                                }`}
                              >
                                {u.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              {canEdit ? (
                                <Button
                                  className="rounded-btn border border-tele-border bg-white text-gray-700 hover:bg-gray-50 font-medium h-8 px-3 text-xs"
                                  onPress={() => openEdit(u)}
                                >
                                  Edit
                                </Button>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {filteredItems.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-tele-border">
                    <p className="text-sm text-gray-500">
                      Page <span className="font-bold text-tele-dark">{page}</span> of{" "}
                      <span className="font-bold text-tele-dark">{totalPages}</span>
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
          )}

          {activeTab === "phones" && (
            <div>
              <div className="p-6 border-b border-tele-border flex flex-col md:flex-row md:items-end justify-between gap-4 bg-gray-50/50">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-tele-dark flex items-center gap-2">
                    <Smartphone size={20} className="text-tele-primary" />
                    Phone Assignment
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Register phones with IMEI and assign them to agents for call tracking.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <Button
                    className="rounded-btn border border-tele-border bg-white text-gray-700 hover:bg-gray-50 transition-colors w-full sm:w-auto font-medium px-4 h-10"
                    startContent={<RefreshCw size={16} />}
                    onPress={() => fetchPhoneDevices()}
                    isDisabled={isLoadingPhones}
                  >
                    Refresh
                  </Button>
                  <Button
                    className="rounded-btn bg-tele-primary text-white hover:bg-tele-secondary transition-colors w-full sm:w-auto font-medium px-5 h-10"
                    startContent={<Plus size={16} />}
                    onPress={() => resetPhoneForm(true)}
                  >
                    Add Phone
                  </Button>
                </div>
              </div>
              
              <div className="p-6">
                {isLoadingPhones ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50/50 rounded-card border border-tele-border">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-tele-primary mb-3"></div>
                    <p className="font-medium text-tele-dark">Loading phones...</p>
                  </div>
                ) : !phoneDevices.length ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50/50 rounded-card border border-tele-border">
                    <div className="bg-gray-200 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                       <Smartphone className="text-gray-400" size={24} />
                    </div>
                    <p className="font-bold text-lg text-tele-dark">No phones registered</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Add a phone device to assign it to an agent.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-card border border-tele-border">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-gray-50 text-gray-600 border-b border-tele-border">
                        <tr>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider">Label</th>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider">Device Info</th>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider">Assignee</th>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider">Status</th>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-tele-border bg-white">
                        {phoneDevices.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-4 font-bold text-tele-dark">{p.label}</td>
                            <td className="px-5 py-4">
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-700">{p.manufacturer} {p.model}</span>
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">IMEI: {p.imei}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              {p.assignee ? (
                                <span className="font-medium text-tele-primary">{p.assignee.fullName}</span>
                              ) : (
                                <span className="text-gray-400 italic text-xs">Unassigned</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                  p.isActive
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-red-50 text-red-700 border-red-200"
                                }`}
                              >
                                {p.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <Button
                                className="rounded-btn border border-tele-border bg-white text-gray-700 hover:bg-gray-50 font-medium h-8 px-3 text-xs"
                                onPress={() => openPhoneForEdit(p)}
                              >
                                Edit
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "shopify" && (
            <div>
              <div className="p-6 border-b border-tele-border flex items-center gap-4 bg-gray-50/50">
                <div className="w-12 h-12 rounded-[1rem] bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <ShoppingCart size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-tele-dark">Shopify Configuration</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Connect your Shopify store to sync abandoned checkouts and convert them into leads.
                  </p>
                </div>
              </div>
              <div className="p-6">
                {isLoadingShopify ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50/50 rounded-card border border-tele-border">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
                    <p className="font-medium text-tele-dark">Loading settings...</p>
                  </div>
                ) : (
                  <div className="max-w-2xl">
                    <form onSubmit={onSaveShopify} className="space-y-6">
                      <div className="space-y-4">
                        <label className="block w-full">
                          <span className="mb-1.5 block text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Shopify Abandoned Cart API URL
                          </span>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Globe size={18} className="text-gray-400" />
                            </div>
                            <input
                              className="w-full rounded-input border border-tele-border bg-gray-50 pl-10 pr-3 py-3 text-sm text-tele-dark outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary"
                              placeholder="https://ab-checkout.megascale.co.in/app/api/abandoned-checkouts"
                              value={shopifyForm.shopifyAbandonedCartApiUrl}
                              onChange={(e) => setShopifyForm(prev => ({ ...prev, shopifyAbandonedCartApiUrl: e.target.value }))}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-2">Paste the full API URL for abandoned checkouts here. Use {'{shop}'} as a placeholder if needed.</p>
                        </label>

                        <div className="rounded-card bg-amber-50 p-4 border border-amber-200">
                          <p className="text-sm text-amber-800 leading-relaxed">
                            <strong className="font-bold block mb-1">Important Configuration:</strong>
                            Ensure your URL includes the <code className="bg-white/60 px-1 py-0.5 rounded font-mono text-xs">shop=...</code> parameter if required by your provider.
                            For Megascale API, use: <br/>
                            <code className="block mt-2 font-mono text-xs break-all bg-white/60 p-2 rounded border border-amber-100">
                              https://ab-checkout.megascale.co.in/app/api/abandoned-checkouts?shop=YOUR_STORE_URL
                            </code>
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-start border-t border-tele-border pt-6">
                        <Button
                          type="submit"
                          className="rounded-btn bg-tele-primary text-white hover:bg-tele-secondary font-medium px-8 h-12 shadow-md shadow-tele-primary/20"
                          isLoading={isSavingShopify}
                          startContent={!isSavingShopify && <Save size={18} />}
                        >
                          Save Configuration
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <UserFormModal
        key={`${modalOpen ? 'open' : 'closed'}-${activeUser?.id || modalMode}`}
        isOpen={modalOpen}
        mode={modalMode}
        initialUser={activeUser}
        canEdit={canEdit}
        isSaving={isSaving}
        error={saveError}
        onClose={closeModal}
        onSubmit={onSubmit}
      />
      <PhoneFormModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        onSave={onSubmitPhone}
        isSaving={isSavingPhone}
        form={phoneForm}
        setForm={setPhoneForm}
        activePhone={activePhone}
        agentAssignees={agentAssignees}
      />
    </section>
  );
}

export default AdminSetupPage;
