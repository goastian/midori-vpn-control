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
      meta: { public: true },
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('../views/AuthCallback.vue'),
      meta: { public: true },
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
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'landing' }
  }

  // Revalidate profile from server on every admin navigation
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
