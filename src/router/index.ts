import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
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
      path: '/',
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

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login' }
  }
  if (to.meta.admin && !auth.isAdmin) {
    return { name: 'dashboard' }
  }
})

export default router
