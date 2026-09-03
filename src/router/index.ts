import { createRouter, createWebHistory, type Router } from 'vue-router'
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
      component: () => import('../views/LandingView.vue'),
      meta: { public: true, fullPage: true },
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('../views/AuthCallback.vue'),
      meta: { public: true, fullPage: true, bootstrapBypass: true },
    },
    {
      // Dedicated callback route for the browser extension.
      // The extension intercepts this navigation and closes the tab.
      // This route just shows a neutral loading screen as a fallback.
      path: '/extension/callback',
      name: 'extension-callback',
      component: () => import('../views/ExtensionCallback.vue'),
      meta: { public: true, fullPage: true, bootstrapBypass: true },
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
      path: '/proxy',
      name: 'proxy-credentials',
      component: () => import('../views/ProxyManagementView.vue'),
    },
    // Admin routes
    {
      path: '/admin/health',
      name: 'admin-health',
      component: () => import('../views/admin/AdminClusterHealthView.vue'),
      meta: { admin: true },
    },
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
      path: '/admin/extensions',
      name: 'admin-extensions',
      component: () => import('../views/admin/AdminExtensionOriginsView.vue'),
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

export function installAuthGuard(targetRouter: Router): void {
  targetRouter.beforeEach(async (to) => {
    const auth = useAuthStore()

    // OAuth callbacks must remain reachable before a stored web session is
    // restored. Their full-page views never expose the authenticated shell.
    if (to.meta.bootstrapBypass) return true

    // Resolve both refresh and the validated profile before routing decisions.
    await auth.restoreSession()

    // Keep the requested location while App displays the recoverable bootstrap
    // failure. A successful retry can then reveal or redirect it deterministically.
    if (auth.bootstrapState === 'error') return true

    // Never keep users on an intermediate login screen.
    // Hitting /login should jump directly to the Authentik authorization endpoint.
    if (to.name === 'login' && !auth.isAuthenticated) {
      try {
        await auth.startLogin()
        return false
      } catch {
        return true
      }
    }

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
        return auth.isAuthenticated ? { name: 'dashboard' } : { name: 'landing' }
      }
      if (!auth.isAdmin) {
        return { name: 'dashboard' }
      }
    }
  })
}

installAuthGuard(router)

export default router
