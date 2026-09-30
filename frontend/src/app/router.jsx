// // import { createBrowserRouter } from 'react-router-dom'
// // import { Suspense, lazy } from 'react'
// // import MainLayout from '../layouts/MainLayout'
// // import ProtectedRoute from '../features/auth/components/ProtectedRoute'
// // import RoleGuard from '../features/auth/components/RoleGuard'
// // import RouteLoader from '../components/common/RouteLoader'
// // import RouteErrorPage from '../components/common/RouteErrorPage'

// // const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'))
// // const AdminSetupPage = lazy(() => import('../features/admin/pages/AdminSetupPage'))
// // const CallsPage = lazy(() => import('../features/calls/pages/CallsPage'))
// // const AgentCallsPage = lazy(() => import('../features/calls/pages/AgentCallsPage'))
// // const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage'))
// // const FollowupsPage = lazy(() => import('../features/followups/pages/FollowupsPage'))
// // const LeadsPage = lazy(() => import('../features/leads/pages/LeadsPage'))
// // const ReportsPage = lazy(() => import('../features/reports/pages/ReportsPage'))
// // const SuperAdminCompaniesPage = lazy(() => import('../features/superAdmin/pages/SuperAdminCompaniesPage'))
// // const SuperAdminRbacPage = lazy(() => import('../features/superAdmin/pages/SuperAdminRbacPage'))
// // const HelpPage = lazy(() => import('../features/help/pages/HelpPage'))
// // const ShopifyAbandonedCartsPage = lazy(() => import('../features/integrations/pages/ShopifyAbandonedCartsPage'))


// // const withSuspense = (element, label) => (
// //   <Suspense fallback={<RouteLoader label={label} />}>{element}</Suspense>
// // )

// // export const appRouter = createBrowserRouter([
// //   {
// //     path: '/login',
// //     element: withSuspense(<LoginPage />, 'Loading login...'),
// //     errorElement: <RouteErrorPage />,
// //   },
// //   {
// //     path: '/',
// //     element: (
// //       <ProtectedRoute>
// //         <MainLayout />
// //       </ProtectedRoute>
// //     ),
// //     errorElement: <RouteErrorPage />,
// //     children: [
// //       {
// //         index: true,
// //         element: (
// //           <RoleGuard allow={['admin', 'manager', 'team_lead', 'agent']}>
// //             {withSuspense(<DashboardPage />, 'Loading dashboard...')}
// //           </RoleGuard>
// //         ),
// //       },
// //       {
// //         path: 'admin-setup',
// //         element: (
// //           <RoleGuard allow={['admin', 'manager']}>
// //             {withSuspense(<AdminSetupPage />, 'Loading admin setup...')}
// //           </RoleGuard>
// //         ),
// //       },
// //       {
// //         path: 'super/companies',
// //         element: (
// //           <RoleGuard allow={['super_admin']}>
// //             {withSuspense(<SuperAdminCompaniesPage />, 'Loading companies...')}
// //           </RoleGuard>
// //         ),
// //       },
// //       {
// //         path: 'super/rbac',
// //         element: (
// //           <RoleGuard allow={['super_admin']}>
// //             {withSuspense(<SuperAdminRbacPage />, 'Loading RBAC...')}
// //           </RoleGuard>
// //         ),
// //       },
// //       {
// //         path: 'leads',
// //         element: (
// //           <RoleGuard allow={['admin', 'manager', 'team_lead', 'agent']}>
// //             {withSuspense(<LeadsPage />, 'Loading leads...')}
// //           </RoleGuard>
// //         ),
// //       },
// //       {
// //         path: 'calls',
// //         element: (
// //           <RoleGuard allow={['admin', 'manager', 'team_lead']}>
// //             {withSuspense(<CallsPage />, 'Loading calls...')}
// //           </RoleGuard>
// //         ),
// //       },
// //       {
// //         path: 'agent/calls',
// //         element: (
// //           <RoleGuard allow={['agent']}>
// //             {withSuspense(<AgentCallsPage />, 'Loading agent calls...')}
// //           </RoleGuard>
// //         ),
// //       },
// //       {
// //         path: 'followups',
// //         element: (
// //           <RoleGuard allow={['admin', 'manager', 'team_lead', 'agent']}>
// //             {withSuspense(<FollowupsPage />, 'Loading follow-ups...')}
// //           </RoleGuard>
// //         ),
// //       },
// //       {
// //         path: 'reports',
// //         element: (
// //           <RoleGuard allow={['admin', 'manager', 'team_lead']}>
// //             {withSuspense(<ReportsPage />, 'Loading reports...')}
// //           </RoleGuard>
// //         ),
// //       },
// //       {
// //         path: 'help',
// //         element: (
// //           <RoleGuard allow={['admin', 'manager', 'team_lead', 'agent']}>
// //             {withSuspense(<HelpPage />, 'Loading help...')}
// //           </RoleGuard>
// //         ),
// //       },
// //       {
// //         path: 'shopify-abandoned',
// //         element: (
// //           <RoleGuard allow={['admin', 'manager']}>
// //             {withSuspense(<ShopifyAbandonedCartsPage />, 'Loading shopify carts...')}
// //           </RoleGuard>
// //         ),
// //       },

// //     ],
// //   },
// // ])


// import { createBrowserRouter } from 'react-router-dom'
// import { Suspense, lazy } from 'react'
// import MainLayout from '../layouts/MainLayout'
// import ProtectedRoute from '../features/auth/components/ProtectedRoute'
// import RoleGuard from '../features/auth/components/RoleGuard'
// import RouteLoader from '../components/common/RouteLoader'
// import RouteErrorPage from '../components/common/RouteErrorPage'

// const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'))
// const AdminSetupPage = lazy(() => import('../features/admin/pages/AdminSetupPage'))
// const CallsPage = lazy(() => import('../features/calls/pages/CallsPage'))
// const AgentCallsPage = lazy(() => import('../features/calls/pages/AgentCallsPage'))
// const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage'))
// const FollowupsPage = lazy(() => import('../features/followups/pages/FollowupsPage'))
// const LeadsPage = lazy(() => import('../features/leads/pages/LeadsPage'))
// const ReportsPage = lazy(() => import('../features/reports/pages/ReportsPage'))
// const SuperAdminCompaniesPage = lazy(() => import('../features/superAdmin/pages/SuperAdminCompaniesPage'))
// const SuperAdminRbacPage = lazy(() => import('../features/superAdmin/pages/SuperAdminRbacPage'))
// const HelpPage = lazy(() => import('../features/help/pages/HelpPage'))
// const ShopifyAbandonedCartsPage = lazy(() => import('../features/integrations/pages/ShopifyAbandonedCartsPage'))


// const withSuspense = (element, label) => (
//   <Suspense fallback={<RouteLoader label={label} />}>{element}</Suspense>
// )

// export const appRouter = createBrowserRouter([
//   {
//     path: '/login',
//     element: withSuspense(<LoginPage />, 'Loading login...'),
//     errorElement: <RouteErrorPage />,
//   },
//   {
//     path: '/',
//     element: (
//       <ProtectedRoute>
//         <MainLayout />
//       </ProtectedRoute>
//     ),
//     errorElement: <RouteErrorPage />,
//     children: [
//       {
//         index: true,
//         element: (
//           <RoleGuard allow={['admin', 'manager', 'team_lead', 'agent']}>
//             {withSuspense(<DashboardPage />, 'Loading dashboard...')}
//           </RoleGuard>
//         ),
//       },
//       {
//         path: 'admin-setup',
//         element: (
//           <RoleGuard allow={['admin', 'manager']}>
//             {withSuspense(<AdminSetupPage />, 'Loading admin setup...')}
//           </RoleGuard>
//         ),
//       },
//       {
//         path: 'super/companies',
//         element: (
//           <RoleGuard allow={['super_admin']}>
//             {withSuspense(<SuperAdminCompaniesPage />, 'Loading companies...')}
//           </RoleGuard>
//         ),
//       },
//       {
//         path: 'super/rbac',
//         element: (
//           <RoleGuard allow={['super_admin']}>
//             {withSuspense(<SuperAdminRbacPage />, 'Loading RBAC...')}
//           </RoleGuard>
//         ),
//       },
//       {
//         path: 'leads',
//         element: (
//           <RoleGuard allow={['admin', 'manager', 'team_lead', 'agent']}>
//             {withSuspense(<LeadsPage />, 'Loading leads...')}
//           </RoleGuard>
//         ),
//       },
//       {
//         path: 'calls',
//         element: (
//           <RoleGuard allow={['admin', 'manager', 'team_lead']}>
//             {withSuspense(<CallsPage />, 'Loading calls...')}
//           </RoleGuard>
//         ),
//       },
//       {
//         path: 'agent/calls',
//         element: (
//           <RoleGuard allow={['agent']}>
//             {withSuspense(<AgentCallsPage />, 'Loading agent calls...')}
//           </RoleGuard>
//         ),
//       },
//       {
//         path: 'followups',
//         element: (
//           <RoleGuard allow={['admin', 'manager', 'team_lead', 'agent']}>
//             {withSuspense(<FollowupsPage />, 'Loading follow-ups...')}
//           </RoleGuard>
//         ),
//       },
//       {
//         path: 'reports',
//         element: (
//           <RoleGuard allow={['admin', 'manager', 'team_lead']}>
//             {withSuspense(<ReportsPage />, 'Loading reports...')}
//           </RoleGuard>
//         ),
//       },
//       {
//         path: 'help',
//         element: (
//           <RoleGuard allow={['admin', 'manager', 'team_lead', 'agent']}>
//             {withSuspense(<HelpPage />, 'Loading help...')}
//           </RoleGuard>
//         ),
//       },
//       {
//         path: 'shopify-abandoned',
//         element: (
//           <RoleGuard allow={['admin', 'manager', 'team_lead', 'agent']}>
//             {withSuspense(<ShopifyAbandonedCartsPage />, 'Loading shopify carts...')}
//           </RoleGuard>
//         ),
//       },

//     ],
//   },
// ])


import { createBrowserRouter } from "react-router-dom";
import { Suspense, lazy } from "react";
import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "../features/auth/components/ProtectedRoute";
import RoleGuard from "../features/auth/components/RoleGuard";
import RouteLoader from "../components/common/RouteLoader";
import RouteErrorPage from "../components/common/RouteErrorPage";

const LoginPage = lazy(() => import("../features/auth/pages/LoginPage"));
const AdminSetupPage = lazy(
  () => import("../features/admin/pages/AdminSetupPage"),
);
const CallsPage = lazy(() => import("../features/calls/pages/CallsPage"));
const AgentCallsPage = lazy(
  () => import("../features/calls/pages/AgentCallsPage"),
);
const DashboardPage = lazy(
  () => import("../features/dashboard/pages/DashboardPage"),
);
const FollowupsPage = lazy(
  () => import("../features/followups/pages/FollowupsPage"),
);
const LeadsPage = lazy(() => import("../features/leads/pages/LeadsPage"));
const ReportsPage = lazy(() => import("../features/reports/pages/ReportsPage"));
const SuperAdminCompaniesPage = lazy(
  () => import("../features/superAdmin/pages/SuperAdminCompaniesPage"),
);
const SuperAdminRbacPage = lazy(
  () => import("../features/superAdmin/pages/SuperAdminRbacPage"),
);
const HelpPage = lazy(() => import("../features/help/pages/HelpPage"));
const ShopifyAbandonedCartsPage = lazy(
  () => import("../features/integrations/pages/ShopifyAbandonedCartsPage"),
);
const RecordingsPage = lazy(
  () => import("../features/recordings/pages/RecordingsPage"),
);

const withSuspense = (element, label) => (
  <Suspense fallback={<RouteLoader label={label} />}>{element}</Suspense>
);

export const appRouter = createBrowserRouter([
  {
    path: "/login",
    element: withSuspense(<LoginPage />, "Loading login..."),
    errorElement: <RouteErrorPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: (
          <RoleGuard allow={["admin", "manager", "team_lead", "agent"]}>
            {withSuspense(<DashboardPage />, "Loading dashboard...")}
          </RoleGuard>
        ),
      },
      {
        path: "admin-setup",
        element: (
          <RoleGuard allow={["admin"]}>
            {withSuspense(<AdminSetupPage />, "Loading admin setup...")}
          </RoleGuard>
        ),
      },
      {
        path: "super/companies",
        element: (
          <RoleGuard allow={["super_admin"]}>
            {withSuspense(<SuperAdminCompaniesPage />, "Loading companies...")}
          </RoleGuard>
        ),
      },
      {
        path: "super/rbac",
        element: (
          <RoleGuard allow={["super_admin"]}>
            {withSuspense(<SuperAdminRbacPage />, "Loading RBAC...")}
          </RoleGuard>
        ),
      },
      {
        path: "leads",
        element: (
          <RoleGuard allow={["admin", "manager", "team_lead", "agent"]}>
            {withSuspense(<LeadsPage />, "Loading leads...")}
          </RoleGuard>
        ),
      },
      {
        path: "calls",
        element: (
          <RoleGuard allow={["admin", "manager", "team_lead"]}>
            {withSuspense(<CallsPage />, "Loading calls...")}
          </RoleGuard>
        ),
      },
      {
        path: "agent/calls",
        element: (
          <RoleGuard allow={["agent"]}>
            {withSuspense(<AgentCallsPage />, "Loading agent calls...")}
          </RoleGuard>
        ),
      },
      {
        path: "followups",
        element: (
          <RoleGuard allow={["admin", "manager", "team_lead", "agent"]}>
            {withSuspense(<FollowupsPage />, "Loading follow-ups...")}
          </RoleGuard>
        ),
      },
      {
        path: "reports",
        element: (
          <RoleGuard allow={["admin", "manager", "team_lead"]}>
            {withSuspense(<ReportsPage />, "Loading reports...")}
          </RoleGuard>
        ),
      },
      {
        path: "help",
        element: (
          <RoleGuard allow={["admin", "manager", "team_lead", "agent"]}>
            {withSuspense(<HelpPage />, "Loading help...")}
          </RoleGuard>
        ),
      },
      {
        path: "shopify-abandoned",
        element: (
          <RoleGuard allow={["admin"]}>
            {withSuspense(
              <ShopifyAbandonedCartsPage />,
              "Loading shopify carts...",
            )}
          </RoleGuard>
        ),
      },
      {
        path: "recordings",
        element: (
          <RoleGuard allow={["admin", "manager", "team_lead"]}>
            {withSuspense(<RecordingsPage />, "Loading recordings...")}
          </RoleGuard>
        ),
      },
    ],
  },
]);
