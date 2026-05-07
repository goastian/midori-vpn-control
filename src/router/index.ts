import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('../views/LandingView.vue'),
      meta: { public: true, fullPage: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { public: true, fullPage: true },
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('../views/AuthCallback.vue'),
      meta: { public: true, fullPage: true },
    },
    {
      // Dedicated callback route for the browser extension.
      // The extension intercepts this navigation and closes the tab.
      // This route just shows a neutral loading screen as a fallback.
      path: '/extension/callback',
      name: 'extension-callback',
      component: () => import('../views/ExtensionCallback.vue'),
      meta: { public: true, fullPage: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
    },
    {
      path: '/servers',
      name: 'servers',
      component: () => import('../views/ServersView.vue'),
    },
    {
      path: '/connections',
      name: 'connections',
      component: () => import('../views/PeersView.vue'),
    },
    {
      path: '/audit',
      name: 'audit',
      component: () => import('../views/AuditView.vue'),
    },
    // Admin routes
    {
      path: '/admin/users',
      name: 'admin-users',
      component: () => import('../views/admin/AdminUsersView.vue'),
      meta: { admin: true },
    },
    {
      path: '/admin/users/:id',
      name: 'admin-user-detail',
      component: () => import('../views/admin/AdminUserDetailView.vue'),
      meta: { admin: true },
    },
    {
      path: '/admin/servers',
      name: 'admin-servers',
      component: () => import('../views/admin/AdminServersView.vue'),
      meta: { admin: true },
    },
    {
      path: '/admin/peers',
      name: 'admin-peers',
      component: () => import('../views/admin/AdminPeersView.vue'),
      meta: { admin: true },
    },
    {
      path: '/admin/audit',
      name: 'admin-audit',
      component: () => import('../views/admin/AdminAuditView.vue'),
      meta: { admin: true },
    },
    {
      path: '/admin/mesh',
      name: 'admin-mesh',
      component: () => import('../views/admin/AdminMeshView.vue'),
      meta: { admin: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

// Auth-only routes that should redirect authenticated users to the dashboard.
const REDIRECT_IF_AUTHED = new Set<string | symbol>(['login', 'landing'])

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Always resolve the session before making any routing decision.
  // restoreSession() is idempotent — subsequent calls return the same promise.
  await auth.restoreSession()

  // Redirect authenticated users away from login / landing.
  if (typeof to.name === 'string' && REDIRECT_IF_AUTHED.has(to.name) && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }

  // Protect all non-public routes.
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'landing' }
  }

  // Revalidate profile from server on every admin navigation.
  if (to.meta.admin) {
    try {
      await auth.fetchProfile()
    } catch {
      return { name: 'landing' }
    }
    if (!auth.isAdmin) {
      return { name: 'dashboard' }
    }
  }
})

export default router
