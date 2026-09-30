import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Table,
  Button,
  Chip,
  Card,
  Pagination,
  Checkbox,
} from '@heroui/react'
import { RefreshCcw, RefreshCw, Download, ExternalLink, Settings, Phone, Mail, PhoneCall, AlertTriangle } from 'lucide-react'
import { shopifyApi } from '../api/shopifyApi'
import { callsApi } from '../../calls/api/callsApi'
import DispositionModal from '../../calls/components/DispositionModal'
import { useToast } from '../../../components/common/ToastProvider'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/context/AuthContext'

const normalizeDialNumber = (value) => {
  if (!value) return "";
  return String(value).replace(/[^\d+]/g, "");
};

const openDialer = (phoneNumber) => {
  const dialNumber = normalizeDialNumber(phoneNumber);
  if (!dialNumber || typeof window === "undefined") return false;
  window.location.href = `tel:${dialNumber}`;
  return true;
};

export default function ShopifyAbandonedCartsPage() {
  const [checkouts, setCheckouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isNotConfigured, setIsNotConfigured] = useState(false)
  const [importingId, setImportingId] = useState(null)
  const [isCalling, setIsCalling] = useState(false)
  const [activeCall, setActiveCall] = useState(null)
  const [activeCheckout, setActiveCheckout] = useState(null)
  const [isDispositionOpen, setIsDispositionOpen] = useState(false)
  const [isSavingDisposition, setIsSavingDisposition] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedKeys, setSelectedKeys] = useState(new Set([]))
  const [isBulkImporting, setIsBulkImporting] = useState(false)
  const rowsPerPage = 10
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  const [syncStatusMsg, setSyncStatusMsg] = useState("")

  const toast = useToast()
  const auth = useAuth()
  const userRole = typeof auth.user?.role === 'string' ? auth.user.role : auth.user?.role?.code
  const isAdmin = userRole === 'admin' || userRole === 'manager'

  const fetchCheckouts = async () => {
    setLoading(true)
    setIsNotConfigured(false)
    setIsSyncModalOpen(true)
    setSyncProgress(0)
    setSyncStatusMsg("Connecting to Shopify...")

    const animateTo = async (target, durationMs, stepMsg = null) => {
      if (stepMsg) setSyncStatusMsg(stepMsg)
      let startVal = 0
      setSyncProgress((prev) => {
        startVal = prev
        return prev
      })

      const startTime = Date.now()
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          const elapsed = Date.now() - startTime
          const pct = Math.min(elapsed / durationMs, 1)
          setSyncProgress(Math.round(startVal + (target - startVal) * pct))
          if (pct >= 1) {
            clearInterval(interval)
            resolve()
          }
        }, 30)
      })
    }

    try {
      // Sync abandoned checkouts from Shopify to leads database
      const syncPromise = shopifyApi.syncAbandonedCheckouts()

      // Animate first phase (connecting)
      await animateTo(45, 1000, "Connecting to Shopify API...")

      // Wait for response
      const syncResult = await syncPromise

      // Show checkouts found
      const total = (syncResult.created || 0) + (syncResult.skipped || 0)
      await animateTo(
        75,
        1200,
        `Found ${total || syncResult.totalFound || 0} checkouts in range. Starting sync...`
      )

      // Show lead creation phase
      await animateTo(95, 800, `Syncing ${syncResult.created || 0} checkouts to leads...`)

      // Finish to 100%
      setSyncProgress(100)
      setSyncStatusMsg(`Shopify sync complete: ${syncResult.created || 0} leads created.`)

      // Wait briefly
      await new Promise((resolve) => setTimeout(resolve, 1500))

      toast.success(
        `Shopify sync complete: ${syncResult.created || 0} leads created, ${syncResult.skipped || 0} already existing or invalid.`
      )

      // Fetch latest checkouts list
      const data = await shopifyApi.getAbandonedCheckouts()
      setCheckouts(data)
    } catch (error) {
      if (error.message?.includes('not configured')) {
        setIsNotConfigured(true)
      } else {
        toast.error(error.message || 'Failed to fetch checkouts')
      }
    } finally {
      setLoading(false)
      setIsSyncModalOpen(false)
      setCurrentPage(1)
    }
  }

  useEffect(() => {
    fetchCheckouts()
  }, [])


  const handleImportSingle = async (checkout) => {
    setImportingId(checkout.id)
    try {
      const lead = await shopifyApi.importCheckout(checkout)
      toast.success('Lead created successfully')
      fetchCheckouts()
      return lead
    } catch (error) {
      toast.error(error.message || 'Failed to import checkout')
      throw error
    } finally {
      setImportingId(null)
    }
  }

  const handleBulkImport = async () => {
    const selectedIds = Array.from(selectedKeys)
    if (selectedIds.length === 0) return

    const toImport = checkouts.filter(c => selectedIds.includes(String(c.id)) && !c.isImported)
    
    if (toImport.length === 0) {
      toast.info('No new checkouts selected for import')
      return
    }

    setIsBulkImporting(true)
    try {
      // For now we'll do them in a loop, but we can optimize later with a bulk endpoint
      let successCount = 0
      for (const checkout of toImport) {
        try {
          await shopifyApi.importCheckout(checkout)
          successCount++
        } catch (e) {
          console.error('Bulk import failed for checkout:', checkout.id, e)
        }
      }
      toast.success(`Successfully imported ${successCount} leads`)
      fetchCheckouts()
      setSelectedKeys(new Set([]))
    } catch (error) {
      toast.error('Bulk import process failed')
    } finally {
      setIsBulkImporting(false)
    }
  }

  const handleCall = async (checkout) => {
    const phone = checkout.phone || checkout.customer?.phone || checkout.billing_address?.phone
    if (!phone) {
      toast.error('No phone number available for this checkout')
      return
    }

    setIsCalling(true)
    setActiveCheckout(checkout)
    try {
      let leadId = checkout.leadId
      
      // 1. Import if not already imported
      if (!checkout.isImported) {
        const lead = await handleImportSingle(checkout)
        leadId = lead.id
      }

      if (!leadId) {
        throw new Error('Could not identify lead ID')
      }

      // 2. Start call in backend
      const call = await callsApi.start({
        leadId,
        direction: 'outbound'
      })
      setActiveCall(call)

      // 3. Open dialer
      if (!openDialer(phone)) {
        toast.error("Could not open dialer")
      }

      // 4. Open disposition modal
      setIsDispositionOpen(true)
    } catch (error) {
      console.error('Call failed:', error)
    } finally {
      setIsCalling(false)
    }
  }

  const handleApplyDisposition = async (payload) => {
    if (!activeCall?.id) return
    setIsSavingDisposition(true)
    try {
      await callsApi.applyDisposition(activeCall.id, payload)
      toast.success('Call logged successfully')
      setIsDispositionOpen(false)
      setActiveCall(null)
      setActiveCheckout(null)
    } catch (error) {
      toast.error(error.message || 'Failed to save disposition')
    } finally {
      setIsSavingDisposition(false)
    }
  }

  const renderCell = (checkout, columnKey) => {
    const phone = checkout.phone || checkout.customer?.phone || checkout.billing_address?.phone
    const email = checkout.email || checkout.customer?.email
    const name = (
      checkout.billing_address?.first_name || 
      checkout.customer?.first_name || 
      checkout.customer?.firstName || 
      checkout.billing_address?.last_name || 
      checkout.customer?.last_name || 
      checkout.customer?.lastName || 
      checkout.customer?.displayName || 
      checkout.email || 
      'Unknown Customer'
    ).trim()

    switch (columnKey) {
      case 'customer':
        return (
          <div className="flex flex-col">
            <p className="text-bold text-sm capitalize">{name || 'Unknown Customer'}</p>
            <p className="text-xs text-default-400">{checkout.id}</p>
          </div>
        )
      case 'contact':
        return (
          <div className="flex flex-col gap-1">
            {phone && (
              <div className="flex items-center gap-1 text-xs">
                <Phone size={12} /> {phone}
              </div>
            )}
            {email && (
              <div className="flex items-center gap-1 text-xs">
                <Mail size={12} /> {email}
              </div>
            )}
            {!phone && !email && <span className="text-xs italic text-danger">No contact info</span>}
          </div>
        )
      case 'total':
        return (
          <div className="font-semibold text-primary">
            {checkout.total_price} {checkout.currency}
          </div>
        )
      case 'status':
        return (
          <div className="flex flex-col gap-1 items-start">
            <Chip
              className="capitalize"
              color={checkout.isImported ? 'success' : 'warning'}
              size="sm"
              variant="flat"
            >
              {checkout.isImported ? 'Imported' : 'Pending'}
            </Chip>
            {checkout.lastCall && (
              <div className="text-xs text-default-500 flex flex-col mt-1">
                <span className="font-medium text-[#1f5f50]">Called by: {checkout.lastCall.agentName}</span>
                <span>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(checkout.lastCall.createdAt))}</span>
              </div>
            )}
          </div>
        )
      case 'date':
        return (
          <div className="flex flex-col">
            <p className="text-sm">
              {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(checkout.created_at))}
            </p>
            <p className="text-xs text-default-400">
              {new Intl.DateTimeFormat('en-IN', { timeStyle: 'short' }).format(new Date(checkout.created_at))}
            </p>
          </div>
        )
      case 'actions':
        return (
          <div className="relative flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="bg-[#1f5f50] text-white font-bold px-5 shadow-lg"
              onPress={() => handleCall(checkout)}
              isLoading={isCalling && activeCheckout?.id === checkout.id}
              startContent={!(isCalling && activeCheckout?.id === checkout.id) && <PhoneCall size={14} />}
              disabled={!phone}
            >
              Call
            </Button>
            {!checkout.isImported && (
              <Button
                size="sm"
                color="primary"
                variant="flat"
                className="font-medium"
                isLoading={importingId === checkout.id}
                onPress={() => handleImportSingle(checkout)}
                startContent={!importingId && <Download size={14} />}
                disabled={!phone && !email}
              >
                Import
              </Button>
            )}
            <a
              href={checkout.abandoned_checkout_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 h-unit-8 w-unit-8 flex items-center justify-center rounded-full hover:bg-default-100 text-default-400 active:opacity-50 transition-colors"
              title="Open in Shopify"
            >
              <ExternalLink size={18} />
            </a>
          </div>
        )
      default:
        return checkout[columnKey]
    }
  }

  if (isNotConfigured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 bg-[#fce8df] text-[#cb5f31] rounded-3xl flex items-center justify-center mb-6">
          <AlertTriangle size={40} />
        </div>
        <h1 className="text-2xl font-bold text-[#1f5f50] mb-2">Shopify Integration Not Configured</h1>
        <p className="text-default-500 max-w-md mb-8">
          To sync abandoned checkouts, you need to connect your Shopify store. Please provide your Custom Abandoned Cart API URL in settings.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="flat"
            onPress={fetchCheckouts}
            startContent={<RefreshCcw size={16} />}
          >
            Try Again
          </Button>
          {isAdmin ? (
            <Button
              className="bg-[#cb5f31] text-white"
              as={Link}
              to="/admin-setup?tab=shopify"
              startContent={<Settings size={18} />}
            >
              Go to Settings
            </Button>
          ) : (
            <div className="p-3 rounded-2xl bg-[#f2e3d8] text-[#713720] text-sm font-medium">
              Please contact your Admin to configure Shopify.
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="break-words text-2xl font-bold text-[#1f5f50]">Shopify Abandoned Carts</h1>
          <p className="text-default-500">
            Manage and import abandoned checkouts ({checkouts.length} found)
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          {selectedKeys.size > 0 && (
            <Button
              color="success"
              variant="flat"
              onPress={handleBulkImport}
              isLoading={isBulkImporting}
              startContent={<Download size={16} />}
            >
              Bulk Import ({selectedKeys.size})
            </Button>
          )}
          <Button
            color="primary"
            variant="flat"
            onPress={fetchCheckouts}
            startContent={<RefreshCcw size={16} />}
            isLoading={loading}
          >
            Fetch Carts
          </Button>
        </div>
      </div>

      <Card className="glass rounded-3xl overflow-hidden">
        <div className="scrollbar-soft overflow-x-auto p-0">
          <Table 
            aria-label="Shopify Abandoned Carts Table"
            className="responsive-table-wide"
            selectionMode="multiple"
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
          >
            <Table.Content>
              <Table.Header>
                <Table.Column key="customer" isRowHeader>CUSTOMER</Table.Column>
                <Table.Column key="date">DATE & TIME</Table.Column>
                <Table.Column key="contact">CONTACT INFO</Table.Column>
                <Table.Column key="total">TOTAL PRICE</Table.Column>
                <Table.Column key="status">STATUS</Table.Column>
                <Table.Column key="actions">ACTIONS</Table.Column>
              </Table.Header>
              <Table.Body
                loadingContent={<div className="flex items-center gap-2"><RefreshCcw className="animate-spin" size={16} /> Loading...</div>}
                loadingState={loading ? 'loading' : 'idle'}
                emptyContent={!loading && "No abandoned carts found."}
              >
                {Array.isArray(checkouts) && checkouts.map((item) => (
                  <Table.Row key={item.id}>
                    <Table.Cell>{renderCell(item, 'customer')}</Table.Cell>
                    <Table.Cell>{renderCell(item, 'date')}</Table.Cell>
                    <Table.Cell>{renderCell(item, 'contact')}</Table.Cell>
                    <Table.Cell>{renderCell(item, 'total')}</Table.Cell>
                    <Table.Cell>{renderCell(item, 'status')}</Table.Cell>
                    <Table.Cell>{renderCell(item, 'actions')}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table>
        </div>
      </Card>

      {isDispositionOpen && (
        <DispositionModal
          isOpen={isDispositionOpen}
          onClose={() => !isSavingDisposition && setIsDispositionOpen(false)}
          onSubmit={handleApplyDisposition}
          isSubmitting={isSavingDisposition}
          leadName={
            activeCheckout 
              ? `${activeCheckout.billing_address?.first_name || activeCheckout.customer?.first_name || 'Shopify'} ${activeCheckout.billing_address?.last_name || activeCheckout.customer?.last_name || 'Customer'}`
              : 'Lead'
          }
        />
      )}

      <AnimatePresence>
        {isSyncModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full max-w-md rounded-[2rem] bg-tele-card p-8 shadow-tele-float text-center flex flex-col items-center relative overflow-hidden border border-tele-border"
            >
              {/* Background glow effect */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-tele-primary/20 rounded-full blur-[3rem] pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-tele-primary/10 rounded-full blur-[3rem] pointer-events-none" />

              <div className="relative z-10 w-full flex flex-col items-center">
                <div className="mb-6 h-16 w-16 rounded-full bg-tele-light/50 border-4 border-tele-card flex items-center justify-center shadow-inner relative">
                  <div className="absolute inset-0 rounded-full border-2 border-tele-primary border-t-transparent animate-spin" />
                  <RefreshCw className="text-tele-primary" size={24} />
                </div>

                <h3 className="text-2xl font-black text-tele-dark mb-2 tracking-tight">
                  Syncing Shopify
                </h3>
                <p className="text-gray-500 text-sm mb-8 max-w-[250px] leading-relaxed">
                  Please keep this tab open. We're fetching your abandoned carts.
                </p>

                <div className="w-full mb-8 relative">
                  <div className="flex justify-between items-end mb-2 px-1">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Progress</span>
                    <span className="text-lg font-black text-tele-primary">{syncProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-tele-border/50 rounded-full h-3 overflow-hidden shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${syncProgress}%` }}
                      transition={{ ease: "easeOut", duration: 0.5 }}
                      className="bg-tele-primary h-full rounded-full relative overflow-hidden"
                    />
                  </div>
                </div>
                
                <div className="w-full bg-gray-50/50 dark:bg-tele-border/30 rounded-2xl p-4 flex items-center justify-center gap-3 border border-tele-border text-tele-dark font-medium text-sm">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tele-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-tele-primary"></span>
                  </span>
                  <span className="truncate animate-pulse">{syncStatusMsg}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}










// import { useEffect, useState, useMemo } from 'react'
// import {
//   Table,
//   Button,
//   Chip,
//   Card,
//   Pagination,
//   Checkbox,
// } from '@heroui/react'
// import { RefreshCcw, Download, ExternalLink, Settings, Phone, Mail, PhoneCall, AlertTriangle } from 'lucide-react'
// import { shopifyApi } from '../api/shopifyApi'
// import { callsApi } from '../../calls/api/callsApi'
// import DispositionModal from '../../calls/components/DispositionModal'
// import { useToast } from '../../../components/common/ToastProvider'
// import { Link } from 'react-router-dom'
// import { useAuth } from '../../auth/context/AuthContext'

// const normalizeDialNumber = (value) => {
//   if (!value) return "";
//   return String(value).replace(/[^\d+]/g, "");
// };

// const openDialer = (phoneNumber) => {
//   const dialNumber = normalizeDialNumber(phoneNumber);
//   if (!dialNumber || typeof window === "undefined") return false;
//   window.location.href = `tel:${dialNumber}`;
//   return true;
// };

// export default function ShopifyAbandonedCartsPage() {
//   const [checkouts, setCheckouts] = useState([])
//   const [loading, setLoading] = useState(true)
//   const [isNotConfigured, setIsNotConfigured] = useState(false)
//   const [importingId, setImportingId] = useState(null)
//   const [isCalling, setIsCalling] = useState(false)
//   const [activeCall, setActiveCall] = useState(null)
//   const [activeCheckout, setActiveCheckout] = useState(null)
//   const [isDispositionOpen, setIsDispositionOpen] = useState(false)
//   const [isSavingDisposition, setIsSavingDisposition] = useState(false)
//   const [currentPage, setCurrentPage] = useState(1)
//   const [selectedKeys, setSelectedKeys] = useState(new Set([]))
//   const [isBulkImporting, setIsBulkImporting] = useState(false)
//   const rowsPerPage = 10

//   const toast = useToast()
//   const auth = useAuth()
//   const userRole = typeof auth.user?.role === 'string' ? auth.user.role : auth.user?.role?.code
//   const isAdmin = userRole === 'admin' || userRole === 'manager'

//   const fetchCheckouts = async () => {
//     setLoading(true)
//     setIsNotConfigured(false)
//     try {
//       const data = await shopifyApi.getAbandonedCheckouts()
//       setCheckouts(data)
//     } catch (error) {
//       if (error.message?.includes('not configured')) {
//         setIsNotConfigured(true)
//       } else {
//         toast.error(error.message || 'Failed to fetch checkouts')
//       }
//     } finally {
//       setLoading(false)
//       setCurrentPage(1)
//     }
//   }

//   useEffect(() => {
//     fetchCheckouts()
//   }, [])


//   const handleImportSingle = async (checkout) => {
//     setImportingId(checkout.id)
//     try {
//       const lead = await shopifyApi.importCheckout(checkout)
//       toast.success('Lead created successfully')
//       fetchCheckouts()
//       return lead
//     } catch (error) {
//       toast.error(error.message || 'Failed to import checkout')
//       throw error
//     } finally {
//       setImportingId(null)
//     }
//   }

//   const handleBulkImport = async () => {
//     const selectedIds = Array.from(selectedKeys)
//     if (selectedIds.length === 0) return

//     const toImport = checkouts.filter(c => selectedIds.includes(String(c.id)) && !c.isImported)
    
//     if (toImport.length === 0) {
//       toast.info('No new checkouts selected for import')
//       return
//     }

//     setIsBulkImporting(true)
//     try {
//       // For now we'll do them in a loop, but we can optimize later with a bulk endpoint
//       let successCount = 0
//       for (const checkout of toImport) {
//         try {
//           await shopifyApi.importCheckout(checkout)
//           successCount++
//         } catch (e) {
//           console.error('Bulk import failed for checkout:', checkout.id, e)
//         }
//       }
//       toast.success(`Successfully imported ${successCount} leads`)
//       fetchCheckouts()
//       setSelectedKeys(new Set([]))
//     } catch (error) {
//       toast.error('Bulk import process failed')
//     } finally {
//       setIsBulkImporting(false)
//     }
//   }

//   const handleCall = async (checkout) => {
//     const phone = checkout.phone || checkout.customer?.phone || checkout.billing_address?.phone
//     if (!phone) {
//       toast.error('No phone number available for this checkout')
//       return
//     }

//     setIsCalling(true)
//     setActiveCheckout(checkout)
//     try {
//       let leadId = checkout.leadId
      
//       // 1. Import if not already imported
//       if (!checkout.isImported) {
//         const lead = await handleImportSingle(checkout)
//         leadId = lead.id
//       }

//       if (!leadId) {
//         throw new Error('Could not identify lead ID')
//       }

//       // 2. Start call in backend
//       const call = await callsApi.start({
//         leadId,
//         direction: 'outbound'
//       })
//       setActiveCall(call)

//       // 3. Open dialer
//       if (!openDialer(phone)) {
//         toast.error("Could not open dialer")
//       }

//       // 4. Open disposition modal
//       setIsDispositionOpen(true)
//     } catch (error) {
//       console.error('Call failed:', error)
//     } finally {
//       setIsCalling(false)
//     }
//   }

//   const handleApplyDisposition = async (payload) => {
//     if (!activeCall?.id) return
//     setIsSavingDisposition(true)
//     try {
//       await callsApi.applyDisposition(activeCall.id, payload)
//       toast.success('Call logged successfully')
//       setIsDispositionOpen(false)
//       setActiveCall(null)
//       setActiveCheckout(null)
//     } catch (error) {
//       toast.error(error.message || 'Failed to save disposition')
//     } finally {
//       setIsSavingDisposition(false)
//     }
//   }

//   const renderCell = (checkout, columnKey) => {
//     const phone = checkout.phone || checkout.customer?.phone || checkout.billing_address?.phone
//     const email = checkout.email || checkout.customer?.email
//     const name = (
//       checkout.billing_address?.first_name || 
//       checkout.customer?.first_name || 
//       checkout.customer?.firstName || 
//       checkout.billing_address?.last_name || 
//       checkout.customer?.last_name || 
//       checkout.customer?.lastName || 
//       checkout.customer?.displayName || 
//       checkout.email || 
//       'Unknown Customer'
//     ).trim()

//     switch (columnKey) {
//       case 'customer':
//         return (
//           <div className="flex flex-col">
//             <p className="text-bold text-sm capitalize">{name || 'Unknown Customer'}</p>
//             <p className="text-xs text-default-400">{checkout.id}</p>
//           </div>
//         )
//       case 'contact':
//         return (
//           <div className="flex flex-col gap-1">
//             {phone && (
//               <div className="flex items-center gap-1 text-xs">
//                 <Phone size={12} /> {phone}
//               </div>
//             )}
//             {email && (
//               <div className="flex items-center gap-1 text-xs">
//                 <Mail size={12} /> {email}
//               </div>
//             )}
//             {!phone && !email && <span className="text-xs italic text-danger">No contact info</span>}
//           </div>
//         )
//       case 'total':
//         return (
//           <div className="font-semibold text-primary">
//             {checkout.total_price} {checkout.currency}
//           </div>
//         )
//       case 'status':
//         return (
//           <Chip
//             className="capitalize"
//             color={checkout.isImported ? 'success' : 'warning'}
//             size="sm"
//             variant="flat"
//           >
//             {checkout.isImported ? 'Imported' : 'Pending'}
//           </Chip>
//         )
//       case 'date':
//         return (
//           <div className="flex flex-col">
//             <p className="text-sm">
//               {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(checkout.created_at))}
//             </p>
//             <p className="text-xs text-default-400">
//               {new Intl.DateTimeFormat('en-IN', { timeStyle: 'short' }).format(new Date(checkout.created_at))}
//             </p>
//           </div>
//         )
//       case 'actions':
//         return (
//           <div className="relative flex flex-wrap items-center gap-2">
//             <Button
//               size="sm"
//               className="bg-[#1f5f50] text-white font-bold px-5 shadow-lg"
//               onPress={() => handleCall(checkout)}
//               isLoading={isCalling && activeCheckout?.id === checkout.id}
//               startContent={!(isCalling && activeCheckout?.id === checkout.id) && <PhoneCall size={14} />}
//               disabled={!phone}
//             >
//               Call
//             </Button>
//             {!checkout.isImported && (
//               <Button
//                 size="sm"
//                 color="primary"
//                 variant="flat"
//                 className="font-medium"
//                 isLoading={importingId === checkout.id}
//                 onPress={() => handleImportSingle(checkout)}
//                 startContent={!importingId && <Download size={14} />}
//                 disabled={!phone && !email}
//               >
//                 Import
//               </Button>
//             )}
//             <a
//               href={checkout.abandoned_checkout_url}
//               target="_blank"
//               rel="noopener noreferrer"
//               className="p-2 h-unit-8 w-unit-8 flex items-center justify-center rounded-full hover:bg-default-100 text-default-400 active:opacity-50 transition-colors"
//               title="Open in Shopify"
//             >
//               <ExternalLink size={18} />
//             </a>
//           </div>
//         )
//       default:
//         return checkout[columnKey]
//     }
//   }

//   if (isNotConfigured) {
//     return (
//       <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
//         <div className="w-20 h-20 bg-[#fce8df] text-[#cb5f31] rounded-3xl flex items-center justify-center mb-6">
//           <AlertTriangle size={40} />
//         </div>
//         <h1 className="text-2xl font-bold text-[#1f5f50] mb-2">Shopify Integration Not Configured</h1>
//         <p className="text-default-500 max-w-md mb-8">
//           To sync abandoned checkouts, you need to connect your Shopify store. Please provide your Custom Abandoned Cart API URL in settings.
//         </p>
//         <div className="flex flex-col gap-3 sm:flex-row">
//           <Button
//             variant="flat"
//             onPress={fetchCheckouts}
//             startContent={<RefreshCcw size={16} />}
//           >
//             Try Again
//           </Button>
//           {isAdmin ? (
//             <Button
//               className="bg-[#cb5f31] text-white"
//               as={Link}
//               to="/admin-setup?tab=shopify"
//               startContent={<Settings size={18} />}
//             >
//               Go to Settings
//             </Button>
//           ) : (
//             <div className="p-3 rounded-2xl bg-[#f2e3d8] text-[#713720] text-sm font-medium">
//               Please contact your Admin to configure Shopify.
//             </div>
//           )}
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="space-y-6 overflow-hidden">
//       <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//         <div>
//           <h1 className="break-words text-2xl font-bold text-[#1f5f50]">Shopify Abandoned Carts</h1>
//           <p className="text-default-500">
//             Manage and import abandoned checkouts ({checkouts.length} found)
//           </p>
//         </div>
//         <div className="flex flex-col gap-3 sm:flex-row">
//           {selectedKeys.size > 0 && (
//             <Button
//               color="success"
//               variant="flat"
//               onPress={handleBulkImport}
//               isLoading={isBulkImporting}
//               startContent={<Download size={16} />}
//             >
//               Bulk Import ({selectedKeys.size})
//             </Button>
//           )}
//           <Button
//             color="primary"
//             variant="flat"
//             onPress={fetchCheckouts}
//             startContent={<RefreshCcw size={16} />}
//             isLoading={loading}
//           >
//             Fetch Carts
//           </Button>
//         </div>
//       </div>

//       <Card className="glass rounded-3xl overflow-hidden">
//         <div className="scrollbar-soft overflow-x-auto p-0">
//           <Table 
//             aria-label="Shopify Abandoned Carts Table"
//             className="responsive-table-wide"
//             selectionMode="multiple"
//             selectedKeys={selectedKeys}
//             onSelectionChange={setSelectedKeys}
//           >
//             <Table.Content>
//               <Table.Header>
//                 <Table.Column key="customer" isRowHeader>CUSTOMER</Table.Column>
//                 <Table.Column key="date">DATE & TIME</Table.Column>
//                 <Table.Column key="contact">CONTACT INFO</Table.Column>
//                 <Table.Column key="total">TOTAL PRICE</Table.Column>
//                 <Table.Column key="status">STATUS</Table.Column>
//                 <Table.Column key="actions">ACTIONS</Table.Column>
//               </Table.Header>
//               <Table.Body
//                 loadingContent={<div className="flex items-center gap-2"><RefreshCcw className="animate-spin" size={16} /> Loading...</div>}
//                 loadingState={loading ? 'loading' : 'idle'}
//                 emptyContent={!loading && "No abandoned carts found."}
//               >
//                 {Array.isArray(checkouts) && checkouts.map((item) => (
//                   <Table.Row key={item.id}>
//                     <Table.Cell>{renderCell(item, 'customer')}</Table.Cell>
//                     <Table.Cell>{renderCell(item, 'date')}</Table.Cell>
//                     <Table.Cell>{renderCell(item, 'contact')}</Table.Cell>
//                     <Table.Cell>{renderCell(item, 'total')}</Table.Cell>
//                     <Table.Cell>{renderCell(item, 'status')}</Table.Cell>
//                     <Table.Cell>{renderCell(item, 'actions')}</Table.Cell>
//                   </Table.Row>
//                 ))}
//               </Table.Body>
//             </Table.Content>
//           </Table>
//         </div>
//       </Card>

//       {isDispositionOpen && (
//         <DispositionModal
//           isOpen={isDispositionOpen}
//           onClose={() => !isSavingDisposition && setIsDispositionOpen(false)}
//           onSubmit={handleApplyDisposition}
//           isSubmitting={isSavingDisposition}
//           leadName={
//             activeCheckout 
//               ? `${activeCheckout.billing_address?.first_name || activeCheckout.customer?.first_name || 'Shopify'} ${activeCheckout.billing_address?.last_name || activeCheckout.customer?.last_name || 'Customer'}`
//               : 'Lead'
//           }
//         />
//       )}
//     </div>
//   )
// }
