import { computed, ref } from 'vue'

export type LocaleCode = 'pt' | 'es' | 'de' | 'en' | 'tr' | 'fr' | 'ru' | 'uk' | 'ca' | 'gl'

interface TranslationTree {
  [key: string]: string | TranslationTree
}

type TranslationValue = string | TranslationTree
type InterpolationParams = Record<string, string | number>

type SupportedLocale = {
  code: LocaleCode
  nativeLabel: string
  intl: string
}

const STORAGE_KEY = 'midori-locale'

export const supportedLocales: SupportedLocale[] = [
  { code: 'pt', nativeLabel: 'Português', intl: 'pt-PT' },
  { code: 'es', nativeLabel: 'Español', intl: 'es-ES' },
  { code: 'de', nativeLabel: 'Deutsch', intl: 'de-DE' },
  { code: 'en', nativeLabel: 'English', intl: 'en-US' },
  { code: 'tr', nativeLabel: 'Türkçe', intl: 'tr-TR' },
  { code: 'fr', nativeLabel: 'Français', intl: 'fr-FR' },
  { code: 'ru', nativeLabel: 'Русский', intl: 'ru-RU' },
  { code: 'uk', nativeLabel: 'Українська', intl: 'uk-UA' },
  { code: 'ca', nativeLabel: 'Català', intl: 'ca-ES' },
  { code: 'gl', nativeLabel: 'Galego', intl: 'gl-ES' },
]

const localeSet = new Set<LocaleCode>(supportedLocales.map((item) => item.code))

function normalizeLocale(value?: string | null): LocaleCode {
  if (!value) return 'es'
  const shortCode = value.toLowerCase().split('-')[0] as LocaleCode
  return localeSet.has(shortCode) ? shortCode : 'es'
}

function detectInitialLocale(): LocaleCode {
  if (typeof window === 'undefined') return 'es'

  const savedLocale = window.localStorage.getItem(STORAGE_KEY)
  if (savedLocale) return normalizeLocale(savedLocale)

  return 'es'
}

const messages: Record<LocaleCode, TranslationTree> = {
  es: {
    language: {
      label: 'Idioma',
      switcherAria: 'Seleccionar idioma',
    },
    common: {
      appName: 'MidoriVPN',
      loading: 'Cargando...',
      save: 'Guardar',
      cancel: 'Cancelar',
      create: 'Crear',
      edit: 'Editar',
      delete: 'Eliminar',
      close: 'Cerrar',
      copy: 'Copiar',
      view: 'Ver',
      actions: 'Acciones',
      active: 'Activo',
      inactive: 'Inactivo',
      status: 'Estado',
      date: 'Fecha',
      details: 'Detalles',
      traffic: 'Tráfico',
      device: 'Dispositivo',
      server: 'Servidor',
      user: 'Usuario',
      users: 'Usuarios',
      servers: 'Servidores',
      peers: 'Peers',
      ip: 'IP',
      name: 'Nombre',
      email: 'Email',
      groups: 'Grupos',
      back: 'Volver',
      allActions: 'Todas las acciones',
      noResults: 'No hay resultados.',
      system: 'sistema',
      unnamed: 'Sin nombre',
      yes: 'Sí',
      no: 'No',
      topFive: 'Top 5',
      live: 'en vivo',
      total: 'Total',
      registeredAccounts: 'cuentas registradas',
      available: '{count} disponibles',
      provisioned: '{count} provisionados',
      totalConnections: '{count} total',
      peersConnected: 'peers conectados',
      sessionActive: 'Sesión activa',
      roleAdmin: 'Perfil administrador',
      roleUser: 'Perfil usuario',
      signOut: 'Cerrar sesión',
      noNamedDevice: 'Dispositivo sin nombre',
      noDataYet: 'Aún no hay datos.',
      connect: 'Conectar',
      connecting: 'Conectando...',
      disconnect: 'Desconectar',
      search: 'Buscar',
      retry: 'Reintentar',
      loadMore: 'Cargar más',
    },
    theme: {
      light: 'Claro',
      dark: 'Oscuro',
      switchToLight: 'Modo claro',
      switchToDark: 'Modo oscuro',
      label: 'Tema',
    },
    nav: {
      general: 'General',
      administration: 'Administración',
      dashboard: 'Dashboard',
      servers: 'Servidores',
      connections: 'Conexiones',
      audit: 'Auditoría',
      adminUsers: 'Usuarios',
      adminServers: 'Admin Servers',
      adminPeers: 'Admin Peers',
      adminMesh: 'Mesh',
      adminLogs: 'Admin Logs',
      openMenu: 'Abrir menú',
      closeMenu: 'Cerrar menú',
    },
    landing: {
      featuresNav: 'Características',
      pricingNav: 'Precios',
      securityNav: 'Seguridad',
      login: 'Iniciar sesión',
      getStarted: 'Comenzar',
      heroBadge: 'Ahora con protocolo WireGuard',
      heroTitleA: 'VPN',
      heroTitleB: 'segura, rápida y',
      heroTitleAccent: 'transparente',
      heroDescription: 'VPN open source construida sobre WireGuard. Analítica en tiempo real, servidores globales y garantía zero-log en un solo panel.',
      heroPrimary: 'Empieza gratis',
      heroSecondary: 'Ver características',
      activeUsers: 'Usuarios activos',
      servers: 'Servidores',
      uptime: 'Disponibilidad',
      networkTraffic: 'Tráfico de red',
      last24h: 'Últimas 24 horas, en tiempo real',
      live: 'En vivo',
      bandwidth: 'Ancho de banda',
      latency: 'Latencia',
      encrypted: 'Cifrado',
      featuresTitle: 'Todo lo que necesitas para una red segura',
      featuresSubtitle: 'Diseñado para velocidad, privacidad y experiencia de desarrollador. Cada función está hecha para que simplemente funcione.',
      pricingTitle: 'Precios simples y transparentes',
      pricingSubtitle: 'Empieza gratis. Escala cuando necesites más. Sin costos ocultos.',
      monthly: 'Mensual',
      annual: 'Anual',
      forever: 'para siempre',
      perMonth: '/mes',
      mostPopular: 'Más popular',
      trustTitle: 'Construido sobre transparencia',
      trustSubtitle: 'Open source. Auditado. Sin concesiones en privacidad.',
      poweredBy: 'Impulsado por',
      ctaTitle: '¿Listo para tomar el control de tu privacidad?',
      ctaSubtitle: 'Únete a miles de usuarios que confían en MidoriVPN para redes rápidas, seguras y transparentes.',
      ctaPrimary: 'Comenzar gratis',
      ctaSecondary: 'Ver en GitHub',
      footerDescription: 'VPN open source construida para velocidad, privacidad y transparencia.',
      footerProduct: 'Producto',
      footerCompany: 'Compañía',
      footerLegal: 'Legal',
      footerDownload: 'Descargar',
      footerChangelog: 'Cambios',
      footerAbout: 'Sobre Astian',
      footerBlog: 'Blog',
      footerCareers: 'Carreras',
      footerContact: 'Contacto',
      footerPrivacy: 'Política de privacidad',
      footerTerms: 'Términos del servicio',
      footerRights: 'Todos los derechos reservados.',
      plans: {
        free: {
          name: 'Free',
          desc: 'Comparte ancho de banda y navega gratis',
          cta: 'Comenzar',
          features: {
            a: '1 dispositivo conectado',
            b: 'Nodo para compartir ancho de banda',
            c: '3 ubicaciones de servidor',
            d: 'Soporte de comunidad',
            e: 'Analítica básica',
          },
        },
        pro: {
          name: 'Pro',
          desc: 'Para personas que necesitan más',
          cta: 'Probar gratis',
          features: {
            a: '5 dispositivos conectados',
            b: '24 ubicaciones de servidor',
            c: 'WireGuard + OpenVPN',
            d: 'Analítica en tiempo real',
            e: 'Soporte prioritario',
            f: 'Sin compartir ancho de banda',
          },
        },
        business: {
          name: 'Business',
          desc: 'Para equipos y organizaciones',
          cta: 'Contactar ventas',
          features: {
            a: 'Dispositivos ilimitados',
            b: '48+ ubicaciones de servidor',
            c: 'Todos los protocolos',
            d: 'Panel de administración',
            e: 'Soporte dedicado',
            f: 'DNS personalizado',
            g: 'Integración SSO',
          },
        },
      },
      featureCards: {
        wireguard: {
          title: 'Protocolo WireGuard',
          desc: 'Criptografía de última generación con velocidades muy superiores. Hasta 3 veces más rápido que protocolos tradicionales.',
        },
        analytics: {
          title: 'Analítica en tiempo real',
          desc: 'Monitorea ancho de banda, latencia y salud de conexión con paneles en vivo impulsados por WebSockets.',
        },
        global: {
          title: 'Red global de servidores',
          desc: 'Conéctate a 48+ servidores. Selección automática por menor latencia para obtener el mejor rendimiento.',
        },
        devices: {
          title: 'Soporte multidispositivo',
          desc: 'Protege todos tus dispositivos con una sola cuenta. Exporta configuraciones como QR para configuraciones móviles instantáneas.',
        },
        noLogs: {
          title: 'Política zero-log',
          desc: 'Nunca almacenamos tu navegación. Código abierto para transparencia y confianza completas.',
        },
        mesh: {
          title: 'Red mallada',
          desc: 'Conexiones peer-to-peer con NAT traversal. Arquitectura descentralizada para máxima resiliencia.',
        },
      },
      trustCards: {
        openSource: {
          title: 'Open Source',
          desc: 'Código fuente completo disponible en GitHub. Audítalo cuando quieras.',
        },
        zeroLog: {
          title: 'Zero-Log',
          desc: 'No registramos actividad de navegación ni metadatos de conexión.',
        },
        wireguard: {
          title: 'WireGuard',
          desc: 'Criptografía moderna con una superficie de ataque mínima.',
        },
        gdpr: {
          title: 'Listo para GDPR',
          desc: 'Tratamiento de datos conforme. Servidores europeos disponibles.',
        },
      },
    },
    login: {
      subtitle: 'Panel de control',
      submit: 'Iniciar sesión con Astian',
      connecting: 'Conectando...',
      providerHint: 'Inicia sesión con tu cuenta de Astian',
    },
    authCallback: {
      missingCode: 'No se recibió código de autorización',
      invalidState: 'Estado OAuth inválido. Posible ataque CSRF. Intenta iniciar sesión de nuevo.',
      authError: 'Error durante la autenticación',
      title: 'Error de autenticación',
      backToLogin: 'Volver al login',
      authenticating: 'Autenticando...',
    },
    dashboard: {
      eyebrow: 'Midori Control Center',
      title: 'Panel de rendimiento',
      subtitle: 'Seguimiento de conexiones, tráfico y salud operativa en tiempo real.',
      cards: {
        activeConnections: 'Conexiones activas',
        networkUsage: 'Uso de red',
        currentStatus: 'Estado actual',
      },
      weeklyTraffic: 'Tráfico de red semanal',
      weeklyTrafficSubtitle: 'Acumulado por fecha de aprovisionamiento de conexiones.',
      connectionHealth: 'Salud de conexiones',
      connectionHealthSubtitle: 'Distribución de estado activo e inactivo.',
      activePlural: 'activas',
      inactivePlural: 'inactivas',
      performanceByDevice: 'Rendimiento por dispositivo',
      noDeviceTraffic: 'Aún no hay datos de tráfico por dispositivo.',
      recentActivity: 'Actividad reciente',
      noRecentConnections: 'No existen conexiones recientes para mostrar.',
      platformMetrics: 'Métricas de plataforma',
      platformMetricsSubtitle: 'Resumen general de infraestructura administrada.',
      globalTraffic: 'Tráfico global',
      activeLabel: 'Activos',
      inactiveLabel: 'Inactivas',
      connectionsActiveSuffix: '{count} conexión(es) activa(s)',
      desktopDownload: {
        eyebrow: 'Cliente de escritorio',
        title: 'Descarga MidoriVPN Desktop',
        subtitle: 'Instala el cliente nativo para conectarte con una experiencia más simple y gestionar tu VPN desde el escritorio.',
        detected: 'Sistema detectado: {platform}',
        recommended: 'Descarga recomendada',
        recommendedBadge: 'Recomendado',
        primaryAction: 'Descargar instalador',
        allReleases: 'Ver todos los releases',
        releaseSource: 'Binarios publicados desde GitHub Releases de MidoriVPN Desktop.',
        platforms: {
          windows: 'Windows',
          macos: 'macOS',
          linux: 'Linux',
          unknown: 'No detectado',
        },
        actions: {
          windows: 'Windows x64',
          macosArm: 'macOS Apple Silicon',
          macosIntel: 'macOS Intel',
          linux: 'Linux x64',
        },
        hints: {
          windows: 'Instalador MSI para Windows 10 y 11.',
          macosArm: 'DMG para Mac con chip Apple Silicon.',
          macosIntel: 'DMG para Mac con procesador Intel.',
          linux: 'AppImage portable para la mayoría de distribuciones Linux.',
        },
      },
    },
    serversView: {
      title: 'Servidores VPN',
      empty: 'No hay servidores disponibles.',
      load: 'Carga',
    },
    connectionsView: {
      title: 'Mis conexiones VPN',
      newConnection: 'Nueva conexión',
      autoServer: 'Auto (menos cargado)',
      deviceNamePlaceholder: 'Nombre del dispositivo (opcional)',
      publicKeyPlaceholder: 'Tu clave pública WireGuard',
      configTitle: 'Configuración WireGuard',
      copied: 'Configuración copiada al portapapeles. Se limpiará en 60 segundos.',
      closeConfig: 'Cerrar',
      empty: 'No tienes conexiones activas.',
      disconnectConfirm: '¿Desconectar este dispositivo?',
      trafficHeader: 'Tráfico',
      provisionDescription: 'Este panel aprovisiona un perfil WireGuard para tu dispositivo. Si no eliges servidor, se usa el menos cargado automáticamente.',
      generateKey: 'Generar clave WG',
      generatingKeys: 'Generando claves...',
      keyGenerated: 'Clave generada',
      provisionProfile: 'Aprovisionar perfil',
      downloadConf: 'Descargar .conf',
      downloadQR: 'Descargar QR',
      configPrivateKeyHint: 'Si generaste la clave aquí, el .conf ya incluye PrivateKey. Si no, reemplaza PrivateKey con tu clave privada.',
      noActiveServers: 'No hay servidores activos para elegir. Si eres admin, actívalos en Admin Servers.',
      noRespondingServers: 'Hay servidores registrados, pero ninguno está respondiendo al health check del core.',
      serverUnavailable: 'El servidor seleccionado no está disponible. Elige otro o usa modo auto.',
      unavailableLabel: 'no disponible',
      closeModal: 'Cerrar',
      deleteDevice: 'Eliminar dispositivo',
      deleteConfirm: '¿Eliminar este dispositivo permanentemente?',
    },
    auditView: {
      title: 'Registro de auditoría',
      empty: 'No hay registros de auditoría.',
      action: 'Acción',
      ip: 'IP',
      actions: {
        'peer.connect': 'Conexión VPN',
        'peer.disconnect': 'Desconexión VPN',
        'peer.cleanup': 'Limpieza automática',
        'server.create': 'Servidor creado',
        'server.update': 'Servidor actualizado',
        'server.delete': 'Servidor eliminado',
        'admin.server.create': 'Servidor creado',
        'admin.server.update': 'Servidor actualizado',
        'admin.server.delete': 'Servidor eliminado',
        'admin.user.create': 'Usuario creado',
        'admin.user.update': 'Usuario actualizado',
        'admin.user.delete': 'Usuario eliminado',
        'admin.user.ban': 'Usuario baneado',
        'admin.peer.disconnect': 'Desconexión forzada',
      },
    },
    adminUsers: {
      title: 'Gestión de usuarios',
      createUser: 'Crear usuario',
      createTitle: 'Crear usuario',
      namePlaceholder: 'Nombre',
      groupsPlaceholder: 'Grupos (separados por coma)',
      createSubmit: 'Crear',
      banned: 'Baneado',
      ban: 'Ban',
      banReasonPrompt: 'Razón del ban:',
      deleteConfirm: '¿Eliminar este usuario permanentemente?',
    },
    adminUserDetail: {
      back: 'Volver a usuarios',
      info: 'Información',
      registered: 'Registrado',
      activePeers: 'Peers activos ({count})',
      noPeers: 'Sin peers',
      bannedWithReason: 'Baneado: {reason}',
    },
    adminServers: {
      title: 'Admin - Servidores',
      addServer: 'Agregar servidor',
      newServer: 'Nuevo servidor',
      editServer: 'Editar servidor',
      apiPort: 'Puerto API',
      wgPort: 'Puerto WG',
      wgPublicKey: 'Clave pública WG',
      coreToken: 'Core Token',
      location: 'Ubicación',
      country: 'País (US, DE...)',
      maxPeers: 'Máx peers',
      activeToggle: 'Activo',
      saveNew: 'Crear',
      saveEdit: 'Guardar',
      deleteConfirm: '¿Eliminar este servidor permanentemente?',
      endpoint: 'Endpoint público WireGuard (vacío = usar Host)',
    },
    adminPeers: {
      title: 'Admin - Peers',
      empty: 'No hay peers en el sistema.',
      forceDisconnectConfirm: '¿Forzar desconexión de este peer?',
    },
    adminAudit: {
      title: 'Admin - Audit Logs',
      empty: 'No hay registros.',
    },
    adminMesh: {
      title: 'Admin - Mesh Networks',
      empty: 'No hay redes mesh en el sistema.',
      refresh: 'Actualizar',
      connected: 'Conectados',
      noMembers: 'Sin miembros aún.',
      colIp: 'IP Mesh',
      colPublicIp: 'IP Pública',
      statusConnected: 'Conectado',
      statusOffline: 'Desconectado',
    },
  },
  en: {
    language: { label: 'Language', switcherAria: 'Select language' },
    common: {
      appName: 'MidoriVPN', loading: 'Loading...', save: 'Save', cancel: 'Cancel', create: 'Create', edit: 'Edit', delete: 'Delete', close: 'Close', copy: 'Copy', view: 'View', actions: 'Actions', active: 'Active', inactive: 'Inactive', status: 'Status', date: 'Date', details: 'Details', traffic: 'Traffic', device: 'Device', server: 'Server', user: 'User', users: 'Users', servers: 'Servers', peers: 'Peers', ip: 'IP', name: 'Name', email: 'Email', groups: 'Groups', back: 'Back', allActions: 'All actions', noResults: 'No results.', system: 'system', unnamed: 'Unnamed', yes: 'Yes', no: 'No', topFive: 'Top 5', live: 'live', total: 'Total', registeredAccounts: 'registered accounts', available: '{count} available', provisioned: '{count} provisioned', totalConnections: '{count} total', peersConnected: 'connected peers', sessionActive: 'Active session', roleAdmin: 'Admin profile', roleUser: 'User profile', signOut: 'Sign out', noNamedDevice: 'Unnamed device', noDataYet: 'No data yet.', connect: 'Connect', connecting: 'Connecting...', disconnect: 'Disconnect', search: 'Search', retry: 'Retry', loadMore: 'Load more'
    },
    theme: { light: 'Light', dark: 'Dark', switchToLight: 'Light mode', switchToDark: 'Dark mode', label: 'Theme' },
    nav: { general: 'General', administration: 'Administration', dashboard: 'Dashboard', servers: 'Servers', connections: 'Connections', audit: 'Audit', adminUsers: 'Users', adminServers: 'Admin Servers', adminPeers: 'Admin Peers', adminMesh: 'Mesh', adminLogs: 'Admin Logs', openMenu: 'Open menu', closeMenu: 'Close menu' },
    landing: {
      featuresNav: 'Features', pricingNav: 'Pricing', securityNav: 'Security', login: 'Log in', getStarted: 'Get started', heroBadge: 'Now with WireGuard protocol', heroTitleA: 'VPN', heroTitleB: 'Secure, fast and', heroTitleAccent: 'transparent', heroDescription: 'Open-source VPN built on WireGuard. Real-time analytics, global servers, and a zero-log guarantee in one dashboard.', heroPrimary: 'Start for free', heroSecondary: 'See features', activeUsers: 'Active users', servers: 'Servers', uptime: 'Uptime', networkTraffic: 'Network traffic', last24h: 'Last 24 hours, real time', live: 'Live', bandwidth: 'Bandwidth', latency: 'Latency', encrypted: 'Encrypted', featuresTitle: 'Everything you need for secure networking', featuresSubtitle: 'Built for speed, privacy, and developer experience. Every feature is designed to just work.', pricingTitle: 'Simple, transparent pricing', pricingSubtitle: 'Start free. Upgrade when you need more. No hidden fees.', monthly: 'Monthly', annual: 'Annual', forever: 'forever', perMonth: '/mo', mostPopular: 'Most popular', trustTitle: 'Built on transparency', trustSubtitle: 'Open source. Audited. No privacy compromises.', poweredBy: 'Powered by', ctaTitle: 'Ready to take control of your privacy?', ctaSubtitle: 'Join thousands of users who trust MidoriVPN for fast, secure, and transparent networking.', ctaPrimary: 'Get started for free', ctaSecondary: 'View on GitHub', footerDescription: 'Open-source VPN built for speed, privacy, and transparency.', footerProduct: 'Product', footerCompany: 'Company', footerLegal: 'Legal', footerDownload: 'Download', footerChangelog: 'Changelog', footerAbout: 'About Astian', footerBlog: 'Blog', footerCareers: 'Careers', footerContact: 'Contact', footerPrivacy: 'Privacy policy', footerTerms: 'Terms of service', footerRights: 'All rights reserved.',
      plans: { free: { name: 'Free', desc: 'Share bandwidth and browse for free', cta: 'Get started', features: { a: '1 connected device', b: 'Bandwidth sharing node', c: '3 server locations', d: 'Community support', e: 'Basic analytics' } }, pro: { name: 'Pro', desc: 'For individuals who need more', cta: 'Start free trial', features: { a: '5 connected devices', b: '24 server locations', c: 'WireGuard + OpenVPN', d: 'Real-time analytics', e: 'Priority support', f: 'No bandwidth sharing' } }, business: { name: 'Business', desc: 'For teams and organizations', cta: 'Contact sales', features: { a: 'Unlimited devices', b: '48+ server locations', c: 'All protocols', d: 'Admin dashboard', e: 'Dedicated support', f: 'Custom DNS', g: 'SSO integration' } } },
      featureCards: { wireguard: { title: 'WireGuard protocol', desc: 'State-of-the-art cryptography with blazing-fast speeds. Up to 3x faster than traditional protocols.' }, analytics: { title: 'Real-time analytics', desc: 'Monitor bandwidth, latency, and connection health with live WebSocket-powered dashboards.' }, global: { title: 'Global server network', desc: 'Connect to 48+ servers. Automatic low-latency selection for optimal performance.' }, devices: { title: 'Multi-device support', desc: 'Protect every device with one account. Export configs as QR codes for instant mobile setup.' }, noLogs: { title: 'Zero-log policy', desc: 'We never store your browsing data. Open-source code for complete transparency and trust.' }, mesh: { title: 'Mesh networking', desc: 'Peer-to-peer connections with NAT traversal. Decentralized architecture for maximum resilience.' } },
      trustCards: { openSource: { title: 'Open source', desc: 'Full source code available on GitHub. Audit it anytime.' }, zeroLog: { title: 'Zero-log', desc: 'We never log browsing activity or connection metadata.' }, wireguard: { title: 'WireGuard', desc: 'Modern cryptography with a minimal attack surface.' }, gdpr: { title: 'GDPR ready', desc: 'Compliant data handling with EU servers available.' } }
    },
    login: { subtitle: 'Control panel', submit: 'Sign in with Astian', connecting: 'Connecting...', providerHint: 'Sign in with your Astian account' },
    authCallback: { missingCode: 'Authorization code was not received', invalidState: 'Invalid OAuth state. Possible CSRF attack. Please sign in again.', authError: 'Authentication error', title: 'Authentication error', backToLogin: 'Back to login', authenticating: 'Authenticating...' },
    dashboard: {
      eyebrow: 'Midori Control Center',
      title: 'Performance dashboard',
      subtitle: 'Track connections, traffic, and operational health in real time.',
      cards: { activeConnections: 'Active connections', networkUsage: 'Network usage', currentStatus: 'Current status' },
      weeklyTraffic: 'Weekly network traffic',
      weeklyTrafficSubtitle: 'Accumulated by connection provisioning date.',
      connectionHealth: 'Connection health',
      connectionHealthSubtitle: 'Distribution of active and inactive status.',
      activePlural: 'active',
      inactivePlural: 'inactive',
      performanceByDevice: 'Performance by device',
      noDeviceTraffic: 'No per-device traffic data yet.',
      recentActivity: 'Recent activity',
      noRecentConnections: 'No recent connections to display.',
      platformMetrics: 'Platform metrics',
      platformMetricsSubtitle: 'General summary of the managed infrastructure.',
      globalTraffic: 'Global traffic',
      activeLabel: 'Active',
      inactiveLabel: 'Inactive',
      connectionsActiveSuffix: '{count} active connection(s)',
      desktopDownload: {
        eyebrow: 'Desktop client',
        title: 'Download MidoriVPN Desktop',
        subtitle: 'Install the native client for a simpler connection flow and manage your VPN from the desktop.',
        detected: 'Detected system: {platform}',
        recommended: 'Recommended download',
        recommendedBadge: 'Recommended',
        primaryAction: 'Download installer',
        allReleases: 'View all releases',
        releaseSource: 'Binaries are published from MidoriVPN Desktop GitHub Releases.',
        platforms: {
          windows: 'Windows',
          macos: 'macOS',
          linux: 'Linux',
          unknown: 'Not detected',
        },
        actions: {
          windows: 'Windows x64',
          macosArm: 'macOS Apple Silicon',
          macosIntel: 'macOS Intel',
          linux: 'Linux x64',
        },
        hints: {
          windows: 'MSI installer for Windows 10 and 11.',
          macosArm: 'DMG for Macs with Apple Silicon.',
          macosIntel: 'DMG for Macs with Intel processors.',
          linux: 'Portable AppImage for most Linux distributions.',
        },
      },
    },
    serversView: { title: 'VPN servers', empty: 'No servers available.', load: 'Load' },
    connectionsView: { title: 'My VPN connections', newConnection: 'New connection', autoServer: 'Auto (least loaded)', deviceNamePlaceholder: 'Device name (optional)', publicKeyPlaceholder: 'Your WireGuard public key', configTitle: 'WireGuard configuration', copied: 'Configuration copied to clipboard. It will be cleared in 60 seconds.', closeConfig: 'Close', empty: 'You have no active connections.', disconnectConfirm: 'Disconnect this device?', trafficHeader: 'Traffic', provisionDescription: 'This panel provisions a WireGuard profile for your device. If you don\'t choose a server, the least loaded one is used automatically.', generateKey: 'Generate WG key', generatingKeys: 'Generating keys...', keyGenerated: 'Key generated', provisionProfile: 'Provision profile', downloadConf: 'Download .conf', downloadQR: 'Download QR', configPrivateKeyHint: 'If you generated the key here, the .conf already includes PrivateKey. Otherwise, replace PrivateKey with your private key.', noActiveServers: 'No active servers available. If you\'re an admin, activate them in Admin Servers.', noRespondingServers: 'There are registered servers, but none are responding to the core health check.', serverUnavailable: 'The selected server is unavailable. Choose another or use auto mode.', unavailableLabel: 'unavailable', closeModal: 'Close', deleteDevice: 'Delete device', deleteConfirm: 'Permanently delete this device?' },
    auditView: { title: 'Audit log', empty: 'No audit records.', action: 'Action', ip: 'IP', actions: { 'peer.connect': 'VPN connection', 'peer.disconnect': 'VPN disconnection', 'peer.cleanup': 'Automatic cleanup', 'server.create': 'Server created', 'server.update': 'Server updated', 'server.delete': 'Server deleted', 'admin.server.create': 'Server created', 'admin.server.update': 'Server updated', 'admin.server.delete': 'Server deleted', 'admin.user.create': 'User created', 'admin.user.update': 'User updated', 'admin.user.delete': 'User deleted', 'admin.user.ban': 'User banned', 'admin.peer.disconnect': 'Forced disconnection' } },
    adminUsers: { title: 'User management', createUser: 'Create user', createTitle: 'Create user', namePlaceholder: 'Name', groupsPlaceholder: 'Groups (comma separated)', createSubmit: 'Create', banned: 'Banned', ban: 'Ban', banReasonPrompt: 'Ban reason:', deleteConfirm: 'Delete this user permanently?' },
    adminUserDetail: { back: 'Back to users', info: 'Information', registered: 'Registered', activePeers: 'Active peers ({count})', noPeers: 'No peers', bannedWithReason: 'Banned: {reason}' },
    adminServers: { title: 'Admin - Servers', addServer: 'Add server', newServer: 'New server', editServer: 'Edit server', apiPort: 'API port', wgPort: 'WG port', wgPublicKey: 'WG public key', coreToken: 'Core token', location: 'Location', country: 'Country (US, DE...)', maxPeers: 'Max peers', activeToggle: 'Active', saveNew: 'Create', saveEdit: 'Save', deleteConfirm: 'Delete this server permanently?', endpoint: 'Public WireGuard endpoint (empty = use Host)' },
    adminPeers: { title: 'Admin - Peers', empty: 'There are no peers in the system.', forceDisconnectConfirm: 'Force disconnection for this peer?' },
    adminAudit: { title: 'Admin - Audit Logs', empty: 'No records.' },
    adminMesh: { title: 'Admin - Mesh Networks', empty: 'No mesh networks in the system.', refresh: 'Refresh', connected: 'Connected', noMembers: 'No members yet.', colIp: 'Mesh IP', colPublicIp: 'Public IP', statusConnected: 'Connected', statusOffline: 'Offline' },
  },
  pt: {},
  de: {},
  tr: {},
  fr: {},
  ru: {},
  uk: {},
  ca: {},
  gl: {},
} as Record<LocaleCode, TranslationTree>

function cloneTranslations(locale: LocaleCode): TranslationTree {
  const english = messages.en
  if (locale === 'en') return english
  return deepMerge(english, messages[locale])
}

function deepMerge(base: TranslationTree, override: TranslationTree): TranslationTree {
  const merged: TranslationTree = { ...base }
  for (const [key, value] of Object.entries(override)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && typeof base[key] === 'object' && base[key] !== null) {
      merged[key] = deepMerge(base[key] as TranslationTree, value as TranslationTree)
      continue
    }
    merged[key] = value
  }
  return merged
}

const locale = ref<LocaleCode>(detectInitialLocale())

const localizedMessages = computed(() => cloneTranslations(locale.value))

function resolvePath(tree: TranslationTree, path: string): string {
  const result = path.split('.').reduce<TranslationValue | undefined>((acc, segment) => {
    if (!acc || typeof acc === 'string') return undefined
    return acc[segment]
  }, tree)

  return typeof result === 'string' ? result : path
}

function interpolate(text: string, params?: InterpolationParams): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`))
}

function applyLocaleToDocument(code: LocaleCode) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = code
}

applyLocaleToDocument(locale.value)

export function setLocale(code: LocaleCode) {
  const normalized = normalizeLocale(code)
  locale.value = normalized
  applyLocaleToDocument(normalized)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, normalized)
  }
}

export function useLocale() {
  const localeForIntl = computed(() => supportedLocales.find((item) => item.code === locale.value)?.intl ?? 'es-ES')

  function t(path: string, params?: InterpolationParams): string {
    return interpolate(resolvePath(localizedMessages.value, path), params)
  }

  function formatDate(value: string | number | Date, options?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(localeForIntl.value, options).format(new Date(value))
  }

  function formatDateTime(value: string | number | Date, options?: Intl.DateTimeFormatOptions): string {
    return formatDate(value, {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...options,
    })
  }

  function formatWeekdayShort(value: string | number | Date): string {
    return formatDate(value, { weekday: 'short' }).replace('.', '')
  }

  return {
    locale,
    localeForIntl,
    supportedLocales,
    setLocale,
    t,
    formatDate,
    formatDateTime,
    formatWeekdayShort,
  }
}

function fillLocale(localeCode: Exclude<LocaleCode, 'es' | 'en'>, values: TranslationTree) {
  messages[localeCode] = values
}

fillLocale('pt', {
  language: { label: 'Idioma', switcherAria: 'Selecionar idioma' },
  common: { loading: 'Carregando...', save: 'Salvar', cancel: 'Cancelar', create: 'Criar', edit: 'Editar', delete: 'Excluir', close: 'Fechar', copy: 'Copiar', view: 'Ver', actions: 'Ações', active: 'Ativo', inactive: 'Inativo', status: 'Estado', date: 'Data', details: 'Detalhes', traffic: 'Tráfego', device: 'Dispositivo', server: 'Servidor', user: 'Usuário', users: 'Usuários', servers: 'Servidores', peers: 'Peers', name: 'Nome', groups: 'Grupos', back: 'Voltar', allActions: 'Todas as ações', system: 'sistema', unnamed: 'Sem nome', topFive: 'Top 5', live: 'ao vivo', total: 'Total', registeredAccounts: 'contas registradas', available: '{count} disponíveis', provisioned: '{count} provisionados', totalConnections: '{count} total', peersConnected: 'peers conectados', sessionActive: 'Sessão ativa', roleAdmin: 'Perfil administrador', roleUser: 'Perfil usuário', signOut: 'Sair', noNamedDevice: 'Dispositivo sem nome', noDataYet: 'Ainda não há dados.', connect: 'Conectar', connecting: 'Conectando...', disconnect: 'Desconectar', search: 'Pesquisar' },
  theme: { light: 'Claro', dark: 'Escuro', switchToLight: 'Modo claro', switchToDark: 'Modo escuro', label: 'Tema' },
  nav: { general: 'Geral', administration: 'Administração', connections: 'Conexões', audit: 'Auditoria', openMenu: 'Abrir menu', closeMenu: 'Fechar menu' },
  landing: { featuresNav: 'Recursos', pricingNav: 'Preços', securityNav: 'Segurança', login: 'Entrar', getStarted: 'Começar', heroBadge: 'Agora com protocolo WireGuard', heroTitleB: 'VPN segura, rápida e', heroTitleAccent: 'transparente', heroDescription: 'VPN open source baseada em WireGuard. Análises em tempo real, servidores globais e garantia zero-log em um painel.', heroPrimary: 'Comece grátis', heroSecondary: 'Ver recursos', activeUsers: 'Usuários ativos', networkTraffic: 'Tráfego de rede', last24h: 'Últimas 24 horas, em tempo real', featuresTitle: 'Tudo o que você precisa para redes seguras', featuresSubtitle: 'Feito para velocidade, privacidade e experiência do desenvolvedor. Cada recurso foi pensado para simplesmente funcionar.', pricingTitle: 'Preços simples e transparentes', pricingSubtitle: 'Comece grátis. Evolua quando precisar de mais. Sem taxas ocultas.', monthly: 'Mensal', annual: 'Anual', perMonth: '/mês', mostPopular: 'Mais popular', trustTitle: 'Construído sobre transparência', trustSubtitle: 'Open source. Auditável. Sem concessões em privacidade.', poweredBy: 'Impulsionado por', ctaTitle: 'Pronto para assumir o controle da sua privacidade?', ctaSubtitle: 'Junte-se a milhares de usuários que confiam na MidoriVPN para redes rápidas, seguras e transparentes.', ctaPrimary: 'Começar grátis', ctaSecondary: 'Ver no GitHub', footerDescription: 'VPN open source feita para velocidade, privacidade e transparência.', footerProduct: 'Produto', footerCompany: 'Empresa', footerLegal: 'Legal', footerDownload: 'Baixar', footerChangelog: 'Mudanças', footerAbout: 'Sobre a Astian', footerCareers: 'Carreiras', footerPrivacy: 'Política de privacidade', footerTerms: 'Termos de serviço', footerRights: 'Todos os direitos reservados.' },
  login: { subtitle: 'Painel de controle', submit: 'Entrar com Astian', connecting: 'Conectando...' },
  authCallback: { missingCode: 'Código de autorização não recebido', invalidState: 'Estado OAuth inválido. Possível ataque CSRF. Tente entrar novamente.', authError: 'Erro durante a autenticação', title: 'Erro de autenticação', backToLogin: 'Voltar ao login', authenticating: 'Autenticando...' },
  dashboard: { title: 'Painel de desempenho', subtitle: 'Acompanhe conexões, tráfego e saúde operacional em tempo real.', weeklyTraffic: 'Tráfego semanal da rede', weeklyTrafficSubtitle: 'Acumulado por data de provisionamento das conexões.', connectionHealth: 'Saúde das conexões', connectionHealthSubtitle: 'Distribuição entre estados ativos e inativos.', performanceByDevice: 'Desempenho por dispositivo', noDeviceTraffic: 'Ainda não há dados de tráfego por dispositivo.', recentActivity: 'Atividade recente', noRecentConnections: 'Não há conexões recentes para mostrar.', platformMetrics: 'Métricas da plataforma', platformMetricsSubtitle: 'Resumo geral da infraestrutura administrada.', globalTraffic: 'Tráfego global', activeLabel: 'Ativas', inactiveLabel: 'Inativas', connectionsActiveSuffix: '{count} conexão(ões) ativa(s)' },
  serversView: { title: 'Servidores VPN', empty: 'Não há servidores disponíveis.', load: 'Carga' },
  connectionsView: { title: 'Minhas conexões VPN', newConnection: 'Nova conexão', autoServer: 'Auto (menos carregado)', deviceNamePlaceholder: 'Nome do dispositivo (opcional)', publicKeyPlaceholder: 'Sua chave pública WireGuard', configTitle: 'Configuração WireGuard', copied: 'Configuração copiada para a área de transferência. Ela será limpa em 60 segundos.', closeConfig: 'Fechar', empty: 'Você não tem conexões ativas.', disconnectConfirm: 'Desconectar este dispositivo?' },
  auditView: { title: 'Registro de auditoria', empty: 'Não há registros de auditoria.' },
  adminUsers: { title: 'Gestão de usuários', createUser: 'Criar usuário', createTitle: 'Criar usuário', groupsPlaceholder: 'Grupos (separados por vírgula)', createSubmit: 'Criar', banned: 'Banido', banReasonPrompt: 'Motivo do banimento:', deleteConfirm: 'Excluir este usuário permanentemente?' },
  adminUserDetail: { back: 'Voltar aos usuários', info: 'Informações', registered: 'Registrado', activePeers: 'Peers ativos ({count})', noPeers: 'Sem peers', bannedWithReason: 'Banido: {reason}' },
  adminServers: { title: 'Admin - Servidores', addServer: 'Adicionar servidor', newServer: 'Novo servidor', editServer: 'Editar servidor', apiPort: 'Porta da API', wgPort: 'Porta WG', wgPublicKey: 'Chave pública WG', location: 'Localização', country: 'País (US, DE...)', maxPeers: 'Máx. peers', activeToggle: 'Ativo', saveNew: 'Criar', saveEdit: 'Salvar', deleteConfirm: 'Excluir este servidor permanentemente?' },
  adminPeers: { title: 'Admin - Peers', empty: 'Não há peers no sistema.', forceDisconnectConfirm: 'Forçar a desconexão deste peer?' },
  adminAudit: { title: 'Admin - Audit Logs', empty: 'Não há registros.' },
})

fillLocale('de', {
  language: { label: 'Sprache', switcherAria: 'Sprache auswählen' },
  common: { loading: 'Wird geladen...', save: 'Speichern', cancel: 'Abbrechen', create: 'Erstellen', edit: 'Bearbeiten', delete: 'Löschen', close: 'Schließen', copy: 'Kopieren', view: 'Ansehen', actions: 'Aktionen', active: 'Aktiv', inactive: 'Inaktiv', status: 'Status', date: 'Datum', details: 'Details', traffic: 'Verkehr', device: 'Gerät', server: 'Server', user: 'Benutzer', users: 'Benutzer', servers: 'Server', peers: 'Peers', name: 'Name', groups: 'Gruppen', back: 'Zurück', allActions: 'Alle Aktionen', system: 'System', unnamed: 'Unbenannt', live: 'live', total: 'Gesamt', registeredAccounts: 'registrierte Konten', available: '{count} verfügbar', provisioned: '{count} bereitgestellt', totalConnections: '{count} gesamt', peersConnected: 'verbundene Peers', sessionActive: 'Aktive Sitzung', roleAdmin: 'Administratorprofil', roleUser: 'Benutzerprofil', signOut: 'Abmelden', noNamedDevice: 'Unbenanntes Gerät', noDataYet: 'Noch keine Daten.', connect: 'Verbinden', connecting: 'Verbindung wird hergestellt...', disconnect: 'Trennen' },
  theme: { light: 'Hell', dark: 'Dunkel', switchToLight: 'Heller Modus', switchToDark: 'Dunkler Modus', label: 'Thema' },
  nav: { administration: 'Administration', connections: 'Verbindungen', audit: 'Prüfung', openMenu: 'Menü öffnen', closeMenu: 'Menü schließen' },
  landing: { featuresNav: 'Funktionen', pricingNav: 'Preise', securityNav: 'Sicherheit', login: 'Anmelden', getStarted: 'Loslegen', heroBadge: 'Jetzt mit WireGuard-Protokoll', heroTitleB: 'Sicheres, schnelles und', heroTitleAccent: 'transparentes', heroDescription: 'Open-Source-VPN auf WireGuard-Basis. Echtzeit-Analysen, globale Server und Zero-Log-Garantie in einem Dashboard.', heroPrimary: 'Kostenlos starten', heroSecondary: 'Funktionen ansehen', activeUsers: 'Aktive Benutzer', networkTraffic: 'Netzwerkverkehr', last24h: 'Letzte 24 Stunden, in Echtzeit', featuresTitle: 'Alles, was du für sicheres Networking brauchst', pricingTitle: 'Einfache, transparente Preise', monthly: 'Monatlich', annual: 'Jährlich', perMonth: '/Monat', mostPopular: 'Am beliebtesten', trustTitle: 'Auf Transparenz aufgebaut', ctaTitle: 'Bereit, die Kontrolle über deine Privatsphäre zu übernehmen?', ctaPrimary: 'Kostenlos starten', ctaSecondary: 'Auf GitHub ansehen', footerProduct: 'Produkt', footerCompany: 'Unternehmen', footerLegal: 'Rechtliches', footerDownload: 'Download', footerPrivacy: 'Datenschutzrichtlinie', footerTerms: 'Nutzungsbedingungen', footerRights: 'Alle Rechte vorbehalten.' },
  login: { subtitle: 'Kontrollzentrum', submit: 'Mit Astian anmelden', connecting: 'Verbindung wird hergestellt...' },
  authCallback: { missingCode: 'Autorisierungscode wurde nicht empfangen', invalidState: 'Ungültiger OAuth-Status. Möglicher CSRF-Angriff. Bitte erneut anmelden.', authError: 'Authentifizierungsfehler', title: 'Authentifizierungsfehler', backToLogin: 'Zurück zur Anmeldung', authenticating: 'Authentifizierung läuft...' },
  dashboard: { title: 'Leistungsdashboard', subtitle: 'Überwache Verbindungen, Verkehr und Betriebszustand in Echtzeit.', weeklyTraffic: 'Wöchentlicher Netzwerkverkehr', connectionHealth: 'Verbindungszustand', performanceByDevice: 'Leistung pro Gerät', noDeviceTraffic: 'Noch keine Verkehrsdaten pro Gerät.', recentActivity: 'Neueste Aktivität', noRecentConnections: 'Keine aktuellen Verbindungen zum Anzeigen.', platformMetrics: 'Plattformmetriken', globalTraffic: 'Gesamtverkehr' },
  serversView: { title: 'VPN-Server', empty: 'Keine Server verfügbar.', load: 'Auslastung' },
  connectionsView: { title: 'Meine VPN-Verbindungen', newConnection: 'Neue Verbindung', autoServer: 'Auto (geringste Last)', deviceNamePlaceholder: 'Gerätename (optional)', publicKeyPlaceholder: 'Dein öffentlicher WireGuard-Schlüssel', configTitle: 'WireGuard-Konfiguration', copied: 'Konfiguration in die Zwischenablage kopiert. Sie wird in 60 Sekunden gelöscht.', closeConfig: 'Schließen', empty: 'Du hast keine aktiven Verbindungen.', disconnectConfirm: 'Dieses Gerät trennen?' },
  auditView: { title: 'Prüfprotokoll', empty: 'Keine Prüfprotokolle.' },
  adminUsers: { title: 'Benutzerverwaltung', createUser: 'Benutzer erstellen', createTitle: 'Benutzer erstellen', groupsPlaceholder: 'Gruppen (durch Komma getrennt)', createSubmit: 'Erstellen', banned: 'Gesperrt', banReasonPrompt: 'Sperrgrund:', deleteConfirm: 'Diesen Benutzer dauerhaft löschen?' },
  adminUserDetail: { back: 'Zurück zu Benutzern', info: 'Informationen', registered: 'Registriert', activePeers: 'Aktive Peers ({count})', noPeers: 'Keine Peers' },
  adminServers: { title: 'Admin - Server', addServer: 'Server hinzufügen', newServer: 'Neuer Server', editServer: 'Server bearbeiten', apiPort: 'API-Port', wgPort: 'WG-Port', wgPublicKey: 'WG Public Key', location: 'Standort', country: 'Land (US, DE...)', maxPeers: 'Max. Peers', activeToggle: 'Aktiv', saveNew: 'Erstellen', saveEdit: 'Speichern', deleteConfirm: 'Diesen Server dauerhaft löschen?' },
  adminPeers: { title: 'Admin - Peers', empty: 'Keine Peers im System.', forceDisconnectConfirm: 'Verbindung dieses Peers zwangsweise trennen?' },
  adminAudit: { title: 'Admin - Audit-Logs', empty: 'Keine Einträge.' },
})

fillLocale('tr', {
  language: { label: 'Dil', switcherAria: 'Dil seç' },
  common: { loading: 'Yükleniyor...', save: 'Kaydet', cancel: 'İptal', create: 'Oluştur', edit: 'Düzenle', delete: 'Sil', close: 'Kapat', copy: 'Kopyala', view: 'Görüntüle', actions: 'İşlemler', active: 'Aktif', inactive: 'Pasif', status: 'Durum', date: 'Tarih', details: 'Detaylar', traffic: 'Trafik', device: 'Cihaz', server: 'Sunucu', user: 'Kullanıcı', users: 'Kullanıcılar', servers: 'Sunucular', peers: 'Eşler', name: 'Ad', groups: 'Gruplar', back: 'Geri', allActions: 'Tüm işlemler', system: 'sistem', signOut: 'Çıkış yap', connect: 'Bağlan', connecting: 'Bağlanıyor...', disconnect: 'Bağlantıyı kes' },
  nav: { administration: 'Yönetim', connections: 'Bağlantılar', audit: 'Denetim', openMenu: 'Menüyü aç', closeMenu: 'Menüyü kapat' },
  landing: { featuresNav: 'Özellikler', pricingNav: 'Fiyatlandırma', securityNav: 'Güvenlik', login: 'Giriş yap', getStarted: 'Başla', heroBadge: 'Artık WireGuard protokolü ile', heroTitleB: 'Güvenli, hızlı ve', heroTitleAccent: 'şeffaf', heroDescription: 'WireGuard üzerinde çalışan açık kaynaklı VPN. Gerçek zamanlı analizler, küresel sunucular ve zero-log garantisi tek panelde.', heroPrimary: 'Ücretsiz başla', heroSecondary: 'Özellikleri gör', activeUsers: 'Aktif kullanıcılar', networkTraffic: 'Ağ trafiği', monthly: 'Aylık', annual: 'Yıllık', perMonth: '/ay', mostPopular: 'En popüler', ctaTitle: 'Gizliliğinizin kontrolünü almaya hazır mısınız?', ctaPrimary: 'Ücretsiz başla', ctaSecondary: 'GitHub’da görüntüle', footerProduct: 'Ürün', footerCompany: 'Şirket', footerLegal: 'Yasal' },
  login: { subtitle: 'Kontrol paneli', submit: 'Astian ile giriş yap', connecting: 'Bağlanıyor...' },
  authCallback: { missingCode: 'Yetkilendirme kodu alınmadı', invalidState: 'Geçersiz OAuth durumu. Olası CSRF saldırısı. Lütfen yeniden giriş yapın.', title: 'Kimlik doğrulama hatası', backToLogin: 'Girişe dön', authenticating: 'Kimlik doğrulanıyor...' },
  dashboard: { title: 'Performans paneli', subtitle: 'Bağlantıları, trafiği ve operasyonel sağlığı gerçek zamanlı izleyin.', weeklyTraffic: 'Haftalık ağ trafiği', connectionHealth: 'Bağlantı sağlığı', performanceByDevice: 'Cihaza göre performans', recentActivity: 'Son etkinlik', platformMetrics: 'Platform metrikleri' },
  serversView: { title: 'VPN sunucuları', empty: 'Kullanılabilir sunucu yok.', load: 'Yük' },
  connectionsView: { title: 'VPN bağlantılarım', newConnection: 'Yeni bağlantı', autoServer: 'Otomatik (en az yüklü)', deviceNamePlaceholder: 'Cihaz adı (opsiyonel)', publicKeyPlaceholder: 'WireGuard açık anahtarınız', configTitle: 'WireGuard yapılandırması', copied: 'Yapılandırma panoya kopyalandı. 60 saniye içinde temizlenecek.', closeConfig: 'Kapat', empty: 'Aktif bağlantınız yok.', disconnectConfirm: 'Bu cihazın bağlantısı kesilsin mi?' },
})

fillLocale('fr', {
  language: { label: 'Langue', switcherAria: 'Sélectionner la langue' },
  common: { loading: 'Chargement...', save: 'Enregistrer', cancel: 'Annuler', create: 'Créer', edit: 'Modifier', delete: 'Supprimer', close: 'Fermer', copy: 'Copier', view: 'Voir', actions: 'Actions', active: 'Actif', inactive: 'Inactif', status: 'Statut', date: 'Date', details: 'Détails', traffic: 'Trafic', device: 'Appareil', server: 'Serveur', user: 'Utilisateur', users: 'Utilisateurs', servers: 'Serveurs', peers: 'Peers', back: 'Retour', signOut: 'Se déconnecter', connect: 'Connecter', connecting: 'Connexion...', disconnect: 'Déconnecter' },
  nav: { administration: 'Administration', connections: 'Connexions', audit: 'Audit', openMenu: 'Ouvrir le menu', closeMenu: 'Fermer le menu' },
  landing: { featuresNav: 'Fonctionnalités', pricingNav: 'Tarifs', securityNav: 'Sécurité', login: 'Connexion', getStarted: 'Commencer', heroBadge: 'Désormais avec le protocole WireGuard', heroTitleB: 'VPN sécurisé, rapide et', heroTitleAccent: 'transparent', heroDescription: 'VPN open source basé sur WireGuard. Analyses en temps réel, serveurs mondiaux et garantie zéro log dans un seul tableau de bord.', heroPrimary: 'Commencer gratuitement', heroSecondary: 'Voir les fonctionnalités', activeUsers: 'Utilisateurs actifs', networkTraffic: 'Trafic réseau', monthly: 'Mensuel', annual: 'Annuel', perMonth: '/mois', mostPopular: 'Le plus populaire', ctaTitle: 'Prêt à reprendre le contrôle de votre vie privée ?', ctaPrimary: 'Commencer gratuitement', ctaSecondary: 'Voir sur GitHub' },
  login: { subtitle: 'Panneau de contrôle', submit: 'Se connecter avec Astian', connecting: 'Connexion...' },
  authCallback: { missingCode: 'Code d’autorisation non reçu', invalidState: 'État OAuth invalide. Possible attaque CSRF. Veuillez vous reconnecter.', title: 'Erreur d’authentification', backToLogin: 'Retour à la connexion', authenticating: 'Authentification...' },
  dashboard: { title: 'Tableau de performance', subtitle: 'Suivi des connexions, du trafic et de la santé opérationnelle en temps réel.', weeklyTraffic: 'Trafic réseau hebdomadaire', connectionHealth: 'Santé des connexions', performanceByDevice: 'Performance par appareil', recentActivity: 'Activité récente', platformMetrics: 'Métriques de la plateforme' },
  serversView: { title: 'Serveurs VPN', empty: 'Aucun serveur disponible.', load: 'Charge' },
  connectionsView: { title: 'Mes connexions VPN', newConnection: 'Nouvelle connexion', autoServer: 'Auto (le moins chargé)', deviceNamePlaceholder: 'Nom de l’appareil (facultatif)', publicKeyPlaceholder: 'Votre clé publique WireGuard', configTitle: 'Configuration WireGuard', copied: 'Configuration copiée dans le presse-papiers. Elle sera effacée dans 60 secondes.', closeConfig: 'Fermer', empty: 'Vous n’avez aucune connexion active.', disconnectConfirm: 'Déconnecter cet appareil ?' },
})

fillLocale('ru', {
  language: { label: 'Язык', switcherAria: 'Выбрать язык' },
  common: { loading: 'Загрузка...', save: 'Сохранить', cancel: 'Отмена', create: 'Создать', edit: 'Изменить', delete: 'Удалить', close: 'Закрыть', copy: 'Копировать', view: 'Открыть', actions: 'Действия', active: 'Активно', inactive: 'Неактивно', status: 'Статус', date: 'Дата', details: 'Детали', traffic: 'Трафик', device: 'Устройство', server: 'Сервер', user: 'Пользователь', users: 'Пользователи', servers: 'Серверы', peers: 'Пиры', back: 'Назад', signOut: 'Выйти', connect: 'Подключить', connecting: 'Подключение...', disconnect: 'Отключить' },
  nav: { administration: 'Администрирование', connections: 'Подключения', audit: 'Аудит', openMenu: 'Открыть меню', closeMenu: 'Закрыть меню' },
  landing: { featuresNav: 'Функции', pricingNav: 'Тарифы', securityNav: 'Безопасность', login: 'Войти', getStarted: 'Начать', heroBadge: 'Теперь с протоколом WireGuard', heroTitleB: 'Безопасный, быстрый и', heroTitleAccent: 'прозрачный', heroDescription: 'VPN с открытым исходным кодом на базе WireGuard. Аналитика в реальном времени, глобальные серверы и гарантия zero-log в одной панели.', heroPrimary: 'Начать бесплатно', heroSecondary: 'Посмотреть функции', activeUsers: 'Активные пользователи', networkTraffic: 'Сетевой трафик', monthly: 'Ежемесячно', annual: 'Ежегодно', perMonth: '/мес.', mostPopular: 'Самый популярный', ctaTitle: 'Готовы взять под контроль свою приватность?', ctaPrimary: 'Начать бесплатно', ctaSecondary: 'Смотреть на GitHub' },
  login: { subtitle: 'Панель управления', submit: 'Войти через Astian', connecting: 'Подключение...' },
  authCallback: { missingCode: 'Код авторизации не получен', invalidState: 'Недопустимое состояние OAuth. Возможна CSRF-атака. Повторите вход.', title: 'Ошибка аутентификации', backToLogin: 'Вернуться ко входу', authenticating: 'Аутентификация...' },
  dashboard: { title: 'Панель производительности', subtitle: 'Отслеживание подключений, трафика и состояния системы в реальном времени.', weeklyTraffic: 'Недельный сетевой трафик', connectionHealth: 'Состояние подключений', performanceByDevice: 'Производительность по устройствам', recentActivity: 'Последняя активность', platformMetrics: 'Метрики платформы' },
  serversView: { title: 'VPN-серверы', empty: 'Нет доступных серверов.', load: 'Нагрузка' },
  connectionsView: { title: 'Мои VPN-подключения', newConnection: 'Новое подключение', autoServer: 'Авто (минимальная нагрузка)', deviceNamePlaceholder: 'Имя устройства (необязательно)', publicKeyPlaceholder: 'Ваш публичный ключ WireGuard', configTitle: 'Конфигурация WireGuard', copied: 'Конфигурация скопирована в буфер обмена. Она будет очищена через 60 секунд.', closeConfig: 'Закрыть', empty: 'У вас нет активных подключений.', disconnectConfirm: 'Отключить это устройство?' },
})

fillLocale('uk', {
  language: { label: 'Мова', switcherAria: 'Вибрати мову' },
  common: { loading: 'Завантаження...', save: 'Зберегти', cancel: 'Скасувати', create: 'Створити', edit: 'Редагувати', delete: 'Видалити', close: 'Закрити', copy: 'Копіювати', view: 'Переглянути', actions: 'Дії', active: 'Активно', inactive: 'Неактивно', status: 'Статус', date: 'Дата', details: 'Деталі', traffic: 'Трафік', device: 'Пристрій', server: 'Сервер', user: 'Користувач', users: 'Користувачі', servers: 'Сервери', peers: 'Піри', back: 'Назад', signOut: 'Вийти', connect: 'Підключити', connecting: 'Підключення...', disconnect: 'Відключити' },
  nav: { administration: 'Адміністрування', connections: 'Підключення', audit: 'Аудит', openMenu: 'Відкрити меню', closeMenu: 'Закрити меню' },
  landing: { featuresNav: 'Можливості', pricingNav: 'Ціни', securityNav: 'Безпека', login: 'Увійти', getStarted: 'Почати', heroBadge: 'Тепер із протоколом WireGuard', heroTitleB: 'Безпечний, швидкий і', heroTitleAccent: 'прозорий', heroDescription: 'VPN з відкритим кодом на базі WireGuard. Аналітика в реальному часі, глобальні сервери та гарантія zero-log в одній панелі.', heroPrimary: 'Почати безкоштовно', heroSecondary: 'Переглянути можливості' },
  login: { subtitle: 'Панель керування', submit: 'Увійти через Astian', connecting: 'Підключення...' },
  authCallback: { missingCode: 'Код авторизації не отримано', invalidState: 'Недійсний OAuth-стан. Можлива CSRF-атака. Увійдіть ще раз.', title: 'Помилка автентифікації', backToLogin: 'Повернутися до входу', authenticating: 'Автентифікація...' },
  dashboard: { title: 'Панель продуктивності', subtitle: 'Відстеження підключень, трафіку та операційного стану в реальному часі.' },
  serversView: { title: 'VPN-сервери', empty: 'Немає доступних серверів.', load: 'Навантаження' },
  connectionsView: { title: 'Мої VPN-підключення', newConnection: 'Нове підключення', autoServer: 'Авто (найменше навантаження)', deviceNamePlaceholder: 'Назва пристрою (необов’язково)', publicKeyPlaceholder: 'Ваш публічний ключ WireGuard', configTitle: 'Конфігурація WireGuard', copied: 'Конфігурацію скопійовано в буфер обміну. Її буде очищено через 60 секунд.', closeConfig: 'Закрити', empty: 'У вас немає активних підключень.', disconnectConfirm: 'Відключити цей пристрій?' },
})

fillLocale('ca', {
  language: { label: 'Idioma', switcherAria: 'Selecciona idioma' },
  common: { loading: 'Carregant...', save: 'Desar', cancel: 'Cancel·lar', create: 'Crear', edit: 'Editar', delete: 'Eliminar', close: 'Tancar', copy: 'Copiar', view: 'Veure', actions: 'Accions', active: 'Actiu', inactive: 'Inactiu', status: 'Estat', date: 'Data', details: 'Detalls', traffic: 'Trànsit', device: 'Dispositiu', server: 'Servidor', user: 'Usuari', users: 'Usuaris', servers: 'Servidors', peers: 'Peers', back: 'Tornar', signOut: 'Tanca la sessió', connect: 'Connectar', connecting: 'Connectant...', disconnect: 'Desconnectar' },
  nav: { administration: 'Administració', connections: 'Connexions', audit: 'Auditoria', openMenu: 'Obrir menú', closeMenu: 'Tancar menú' },
  landing: { featuresNav: 'Característiques', pricingNav: 'Preus', securityNav: 'Seguretat', login: 'Inicia sessió', getStarted: 'Comença', heroBadge: 'Ara amb protocol WireGuard', heroTitleB: 'VPN segura, ràpida i', heroTitleAccent: 'transparent', heroDescription: 'VPN de codi obert basada en WireGuard. Analítica en temps real, servidors globals i garantia zero-log en un únic panell.', heroPrimary: 'Comença gratis', heroSecondary: 'Veure característiques' },
  login: { subtitle: 'Panell de control', submit: 'Inicia sessió amb Astian', connecting: 'Connectant...' },
  authCallback: { missingCode: 'No s’ha rebut el codi d’autorització', invalidState: 'Estat OAuth invàlid. Possible atac CSRF. Torna a iniciar sessió.', title: 'Error d’autenticació', backToLogin: 'Tornar al login', authenticating: 'Autenticant...' },
  dashboard: { title: 'Panell de rendiment', subtitle: 'Seguiment de connexions, trànsit i salut operativa en temps real.' },
  serversView: { title: 'Servidors VPN', empty: 'No hi ha servidors disponibles.', load: 'Càrrega' },
  connectionsView: { title: 'Les meves connexions VPN', newConnection: 'Nova connexió', autoServer: 'Auto (menys carregat)', deviceNamePlaceholder: 'Nom del dispositiu (opcional)', publicKeyPlaceholder: 'La teva clau pública de WireGuard', configTitle: 'Configuració WireGuard', copied: 'Configuració copiada al porta-retalls. S’esborrarà en 60 segons.', closeConfig: 'Tancar', empty: 'No tens connexions actives.', disconnectConfirm: 'Desconnectar aquest dispositiu?' },
})

fillLocale('gl', {
  language: { label: 'Idioma', switcherAria: 'Seleccionar idioma' },
  common: { loading: 'Cargando...', save: 'Gardar', cancel: 'Cancelar', create: 'Crear', edit: 'Editar', delete: 'Eliminar', close: 'Pechar', copy: 'Copiar', view: 'Ver', actions: 'Accións', active: 'Activo', inactive: 'Inactivo', status: 'Estado', date: 'Data', details: 'Detalles', traffic: 'Tráfico', device: 'Dispositivo', server: 'Servidor', user: 'Usuario', users: 'Usuarios', servers: 'Servidores', peers: 'Peers', back: 'Volver', signOut: 'Pechar sesión', connect: 'Conectar', connecting: 'Conectando...', disconnect: 'Desconectar' },
  nav: { administration: 'Administración', connections: 'Conexións', audit: 'Auditoría', openMenu: 'Abrir menú', closeMenu: 'Pechar menú' },
  landing: { featuresNav: 'Características', pricingNav: 'Prezos', securityNav: 'Seguridade', login: 'Iniciar sesión', getStarted: 'Comezar', heroBadge: 'Agora con protocolo WireGuard', heroTitleB: 'VPN segura, rápida e', heroTitleAccent: 'transparente', heroDescription: 'VPN de código aberto construída sobre WireGuard. Analítica en tempo real, servidores globais e garantía zero-log nun único panel.', heroPrimary: 'Comezar gratis', heroSecondary: 'Ver características' },
  login: { subtitle: 'Panel de control', submit: 'Iniciar sesión con Astian', connecting: 'Conectando...' },
  authCallback: { missingCode: 'Non se recibiu o código de autorización', invalidState: 'Estado OAuth inválido. Posible ataque CSRF. Inicia sesión de novo.', title: 'Erro de autenticación', backToLogin: 'Volver ao login', authenticating: 'Autenticando...' },
  dashboard: { title: 'Panel de rendemento', subtitle: 'Seguimento de conexións, tráfico e saúde operativa en tempo real.' },
  serversView: { title: 'Servidores VPN', empty: 'Non hai servidores dispoñibles.', load: 'Carga' },
  connectionsView: { title: 'As miñas conexións VPN', newConnection: 'Nova conexión', autoServer: 'Auto (menos cargado)', deviceNamePlaceholder: 'Nome do dispositivo (opcional)', publicKeyPlaceholder: 'A túa clave pública WireGuard', configTitle: 'Configuración WireGuard', copied: 'Configuración copiada ao portapapeis. Limparase en 60 segundos.', closeConfig: 'Pechar', empty: 'Non tes conexións activas.', disconnectConfirm: 'Desconectar este dispositivo?' },
})
