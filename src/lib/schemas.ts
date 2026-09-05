import { z } from 'zod'

const NonNegativeIntegerSchema = z.number().int().nonnegative()
const NonNegativeNumberSchema = z.number().finite().nonnegative()
const NonEmptyStringSchema = z.string().min(1)
const TimestampSchema = NonEmptyStringSchema.refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Invalid timestamp',
})

function pageSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    page: z.number().int().min(1),
    page_size: z.number().int().min(1).max(100),
    total: NonNegativeIntegerSchema,
  })
}

// ─── Auth ─────────────────────────────────────────────────

export const TokenResponseSchema = z.object({
  access_token: NonEmptyStringSchema,
  token_type: NonEmptyStringSchema,
  expires_in: z.number().int().positive(),
  refresh_token: z.string().optional(),
  id_token: z.string().optional(),
})

export type TokenResponse = z.infer<typeof TokenResponseSchema>

export const DesktopAgentCallbackResponseSchema = z.object({
  username: z.string().default(''),
})

export type DesktopAgentCallbackResponse = z.infer<typeof DesktopAgentCallbackResponseSchema>

export const UserQuotaSchema = z.object({
  connected_devices: NonNegativeIntegerSchema,
  max_devices: NonNegativeIntegerSchema,
  available_devices: NonNegativeIntegerSchema,
  plan_slug: NonEmptyStringSchema,
  plan_name: NonEmptyStringSchema,
  devices_by_type: z.object({
    desktop: NonNegativeIntegerSchema,
    extension: NonNegativeIntegerSchema,
    wireguard: NonNegativeIntegerSchema,
  }),
})

export type UserQuota = z.infer<typeof UserQuotaSchema>

// ─── User ─────────────────────────────────────────────────

export const UserSchema = z.object({
  id: NonEmptyStringSchema,
  authentik_uid: NonEmptyStringSchema,
  email: NonEmptyStringSchema,
  display_name: z.string().default(''),
  groups: z
    .array(z.string())
    .nullish()
    .transform((groups) => groups ?? []),
  is_banned: z.boolean(),
  banned_at: TimestampSchema.nullable().optional(),
  ban_reason: z.string().default(''),
  created_at: TimestampSchema,
  updated_at: TimestampSchema.optional(),
  quota: UserQuotaSchema.optional(),
})

export type User = z.infer<typeof UserSchema>
export const UserListSchema = z.array(UserSchema)
export const AdminUserPageSchema = pageSchema(UserSchema)
export type AdminUserPage = z.infer<typeof AdminUserPageSchema>

// ─── Server ───────────────────────────────────────────────

export const TransportCapabilitySchema = z.object({
  protocol: z.enum(['wireguard', 'wss', 'masque', 'openvpn', 'ikev2', 'proxy']),
  host: NonEmptyStringSchema,
  port: z.number().int().min(1).max(65535),
  enabled: z.boolean(),
  priority: z.number().int().min(0).max(1000),
  health_status: z.enum(['unknown', 'healthy', 'degraded', 'disabled']),
  last_checked_at: TimestampSchema.nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export type TransportCapability = z.infer<typeof TransportCapabilitySchema>

const ProbeURLSchema = z
  .string()
  .url()
  .refine((value) => {
    const parsed = new URL(value)
    return (
      parsed.protocol === 'https:' &&
      !parsed.username &&
      !parsed.password &&
      !parsed.search &&
      !parsed.hash &&
      parsed.pathname === '/.well-known/midorivpn/edge-health'
    )
  }, 'invalid MidoriVPN edge probe URL')

export const ServerSchema = z.object({
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  host: NonEmptyStringSchema,
  probe_url: z.union([z.literal(''), ProbeURLSchema]).default(''),
  endpoint: z.string().optional().default(''),
  port: z.number().int().min(1).max(65535),
  wg_port: z.number().int().min(1).max(65535),
  public_key: NonEmptyStringSchema,
  location: NonEmptyStringSchema,
  country_code: z.string().default(''),
  max_peers: z.number().int().positive(),
  current_peers: NonNegativeIntegerSchema,
  is_active: z.boolean(),
  draining_at: TimestampSchema.nullable().optional(),
  supports_wireguard: z.boolean().optional().default(false),
  supports_proxy: z.boolean().optional().default(false),
  supports_mesh_exit: z.boolean().optional().default(false),
  transports: z.array(TransportCapabilitySchema),
})

export type Server = z.infer<typeof ServerSchema>
export const ServerListSchema = z.array(ServerSchema)
export const AdminServerPageSchema = pageSchema(ServerSchema)
export type AdminServerPage = z.infer<typeof AdminServerPageSchema>

export const ProxyCredentialResponseSchema = z.object({
  proxy_token: z.string().startsWith('mvpn2.'),
  expires_in: z.number().int().positive().max(900),
  device_id: z.string().uuid(),
  proxy_endpoint: z.object({
    server_id: z.string().uuid(),
    host: z.string().min(1),
    port: z.number().int().min(1).max(65535),
    country_code: z.string().default(''),
    location: NonEmptyStringSchema,
  }),
})
export type ProxyCredentialResponse = z.infer<typeof ProxyCredentialResponseSchema>

export const ServerCandidateSchema = z.object({
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  location: z.string().default(''),
  country_code: z.string().default(''),
  protocol: z.enum(['wireguard', 'wss', 'masque', 'openvpn', 'ikev2', 'proxy']),
  probe_url: ProbeURLSchema,
  endpoint: NonEmptyStringSchema,
  port: z.number().int().min(1).max(65535),
  priority: z.number().int().min(0).max(1000),
})

export type ServerCandidate = z.infer<typeof ServerCandidateSchema>
export const ServerCandidateListSchema = z.array(ServerCandidateSchema)

export const ServerReachabilityResultSchema = z.object({
  server_id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  host: NonEmptyStringSchema,
  location: z.string(),
  country_code: z.string(),
  control_latency_ms: NonNegativeNumberSchema,
  available: z.boolean(),
})

export type ServerReachabilityResult = z.infer<typeof ServerReachabilityResultSchema>
export const ServerReachabilityResultListSchema = z.array(ServerReachabilityResultSchema)

// ─── Connection / Peer ────────────────────────────────────

export const ConnectionSchema = z.object({
  id: NonEmptyStringSchema,
  server_id: NonEmptyStringSchema,
  public_key: NonEmptyStringSchema,
  assigned_ip: NonEmptyStringSchema,
  device_name: z.string().default(''),
  device_id: z.string().nullable().optional(),
  is_active: z.boolean(),
  bytes_sent: NonNegativeIntegerSchema,
  bytes_received: NonNegativeIntegerSchema,
  last_handshake: TimestampSchema.nullable().default(null),
  created_at: TimestampSchema,
})

export type Connection = z.infer<typeof ConnectionSchema>
export const ConnectionListSchema = z.array(ConnectionSchema)

export const DeviceConnectionSchema = z.object({
  id: NonEmptyStringSchema,
  device_id: NonEmptyStringSchema,
  server_id: NonEmptyStringSchema,
  protocol: z.enum(['wireguard', 'openvpn', 'ikev2', 'wss', 'masque', 'proxy']),
  public_key: NonEmptyStringSchema,
  assigned_ip: NonEmptyStringSchema,
  is_active: z.boolean(),
  bytes_sent: NonNegativeIntegerSchema,
  bytes_received: NonNegativeIntegerSchema,
  last_handshake: TimestampSchema.nullable().default(null),
  created_at: TimestampSchema,
  expires_at: TimestampSchema.nullable(),
})

export type DeviceConnection = z.infer<typeof DeviceConnectionSchema>

export const DeviceSchema = z.object({
  id: NonEmptyStringSchema,
  client_instance_id: z.string().nullable(),
  reported_name: z.string().default(''),
  alias: z.string().default(''),
  display_name: z.string().default(''),
  device_type: z.enum(['desktop', 'extension', 'manual', 'mobile']),
  adapter_reference: z.string().default(''),
  adapter_label: z.string().default(''),
  first_seen_at: TimestampSchema,
  last_seen_at: TimestampSchema,
  revoked_at: TimestampSchema.nullable(),
  status: z.enum([
    'connected',
    'disconnected',
    'connecting',
    'disconnecting',
    'cleanup_pending',
    'revoked',
  ]),
  active_connection: DeviceConnectionSchema.nullable(),
})

export type Device = z.infer<typeof DeviceSchema>
export const DeviceListSchema = z.array(DeviceSchema)

export const DeviceSessionPageSchema = pageSchema(DeviceConnectionSchema)

export type DeviceSessionPage = z.infer<typeof DeviceSessionPageSchema>

export const LifecycleStatusSchema = z.object({
  status: z.enum([
    'disconnected',
    'disconnect_pending',
    'banned',
    'ban_cleanup_pending',
    'device_cleanup_pending',
  ]),
  operation_id: z.string().optional(),
})

export type LifecycleStatus = z.infer<typeof LifecycleStatusSchema>
export const DeviceDeleteResponseSchema = z.union([DeviceSchema, LifecycleStatusSchema])

export const ConnectionConfigSchema = z.object({
  peer_id: NonEmptyStringSchema,
  device_id: NonEmptyStringSchema,
  peer_ip: NonEmptyStringSchema,
  server_public_key: NonEmptyStringSchema,
  server_endpoint: NonEmptyStringSchema,
  preshared_key: z.string().optional(),
  dns: NonEmptyStringSchema,
  allowed_ips: NonEmptyStringSchema,
})

export type ConnectionConfig = z.infer<typeof ConnectionConfigSchema>

// ─── Admin Stats ──────────────────────────────────────────

export const AdminStatsSchema = z.object({
  total_users: NonNegativeIntegerSchema,
  total_servers: NonNegativeIntegerSchema,
  active_servers: NonNegativeIntegerSchema,
  total_peers: NonNegativeIntegerSchema,
  active_peers: NonNegativeIntegerSchema,
  total_bytes_sent: NonNegativeIntegerSchema,
  total_bytes_received: NonNegativeIntegerSchema,
})

export type AdminStats = z.infer<typeof AdminStatsSchema>
export const WebSocketStatsMessageSchema = z.object({
  type: z.literal('stats'),
  data: AdminStatsSchema,
})
export type WebSocketStatsMessage = z.infer<typeof WebSocketStatsMessageSchema>

export const DashboardRecentSessionSchema = z.object({
  id: z.string().uuid(),
  device_id: z.string().uuid().nullable(),
  device_name: NonEmptyStringSchema.max(64),
  server_id: z.string().uuid(),
  server_name: NonEmptyStringSchema,
  protocol: z.enum(['wireguard', 'openvpn', 'ikev2', 'wss', 'masque', 'proxy']),
  assigned_ip: NonEmptyStringSchema,
  is_active: z.boolean(),
  bytes_sent: NonNegativeIntegerSchema,
  bytes_received: NonNegativeIntegerSchema,
  last_handshake: TimestampSchema.nullable(),
  created_at: TimestampSchema,
})

export const DashboardSummarySchema = z
  .object({
    registered_devices: NonNegativeIntegerSchema,
    connected_devices: NonNegativeIntegerSchema,
    max_devices: z.number().int().positive(),
    available_devices: NonNegativeIntegerSchema,
    plan_slug: NonEmptyStringSchema,
    plan_name: NonEmptyStringSchema,
    traffic: z.object({
      bytes_sent: NonNegativeIntegerSchema,
      bytes_received: NonNegativeIntegerSchema,
    }),
    recent_sessions: z.array(DashboardRecentSessionSchema).max(6),
    infrastructure: AdminStatsSchema.nullish().transform((value) => value ?? null),
  })
  .refine((summary) => summary.connected_devices <= summary.registered_devices, {
    message: 'Connected devices cannot exceed registered devices',
    path: ['connected_devices'],
  })
  .refine(
    (summary) =>
      summary.available_devices === Math.max(summary.max_devices - summary.connected_devices, 0),
    {
      message: 'Available devices must match the current quota snapshot',
      path: ['available_devices'],
    },
  )

export type DashboardSummary = z.infer<typeof DashboardSummarySchema>

// ─── Audit Log ────────────────────────────────────────────

export const AuditLogSchema = z.object({
  id: NonEmptyStringSchema,
  user_id: z.string().nullable().optional(),
  user_email: z.string().default(''),
  action: NonEmptyStringSchema,
  metadata: z.record(z.string(), z.unknown()),
  ip_address: z.string().default(''),
  created_at: TimestampSchema,
})

export type AuditLog = z.infer<typeof AuditLogSchema>
export const AuditLogListSchema = z.array(AuditLogSchema)
export const AdminAuditLogPageSchema = pageSchema(AuditLogSchema)
export type AdminAuditLogPage = z.infer<typeof AdminAuditLogPageSchema>

// ─── Admin Peer ───────────────────────────────────────────

export const AdminPeerSchema = ConnectionSchema.extend({
  user_id: NonEmptyStringSchema,
  user_email: z.string().default(''),
  expires_at: TimestampSchema.nullable().optional(),
})

export type AdminPeer = z.infer<typeof AdminPeerSchema>
export const AdminPeerListSchema = z.array(AdminPeerSchema)
export const AdminPeerPageSchema = pageSchema(AdminPeerSchema)
export type AdminPeerPage = z.infer<typeof AdminPeerPageSchema>

export const AdminUserDetailSchema = z.object({
  user: UserSchema,
  peers: AdminPeerPageSchema,
})
export type AdminUserDetail = z.infer<typeof AdminUserDetailSchema>

// ─── Admin Mesh ───────────────────────────────────────────

export const AdminMeshMemberSchema = z.object({
  mesh_ip: NonEmptyStringSchema,
  display_name: z.string().default(''),
  email: NonEmptyStringSchema,
  user_id: NonEmptyStringSchema,
  public_ip: z.string().default(''),
  connected: z.boolean(),
  joined_at: TimestampSchema,
})

export type AdminMeshMember = z.infer<typeof AdminMeshMemberSchema>

export const AdminMeshNetworkSchema = z.object({
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  subnet: NonEmptyStringSchema,
  is_active: z.boolean(),
  member_count: NonNegativeIntegerSchema,
  country_code: z.string().default(''),
  is_session: z.boolean().default(false),
  created_at: TimestampSchema,
  members: z.array(AdminMeshMemberSchema),
})

export type AdminMeshNetwork = z.infer<typeof AdminMeshNetworkSchema>
export const AdminMeshNetworkListSchema = z.array(AdminMeshNetworkSchema)
export const AdminMeshNetworkPageSchema = pageSchema(AdminMeshNetworkSchema)
export type AdminMeshNetworkPage = z.infer<typeof AdminMeshNetworkPageSchema>

// ─── Admin multicluster ──────────────────────────────────

export const ClusterStateSchema = z.enum([
  'enrolling',
  'inactive',
  'active',
  'draining',
  'revoked',
  'retired',
])

export const AdminClusterSchema = z
  .object({
    id: z.string().uuid(),
    name: NonEmptyStringSchema.max(64),
    region: NonEmptyStringSchema.max(64),
    state: ClusterStateSchema,
    policy_labels: z.record(z.string(), z.string()).default({}),
    is_principal: z.boolean(),
    node_count: NonNegativeIntegerSchema,
    active_node_count: NonNegativeIntegerSchema,
    healthy_node_count: NonNegativeIntegerSchema,
    created_at: TimestampSchema,
    updated_at: TimestampSchema,
  })
  .refine(
    (cluster) =>
      cluster.active_node_count <= cluster.node_count &&
      cluster.healthy_node_count <= cluster.node_count,
    { message: 'Cluster summary counts are inconsistent' },
  )

export type AdminCluster = z.infer<typeof AdminClusterSchema>
export const AdminClusterPageSchema = pageSchema(AdminClusterSchema)
export type AdminClusterPage = z.infer<typeof AdminClusterPageSchema>

export const AdminNodeTransportStateSchema = z.object({
  status: z.enum(['unknown', 'healthy', 'degraded', 'error', 'disabled']),
  certified: z.boolean(),
})

export const PlacementReasonSchema = z.enum([
  'ready',
  'cluster_not_active',
  'node_not_active',
  'identity_not_enrolled',
  'server_unbound',
  'server_inactive',
  'desired_missing',
  'desired_expired',
  'observation_missing',
  'heartbeat_stale',
  'health_unavailable',
  'version_incompatible',
  'version_drift',
  'revision_drift',
  'capacity_full',
  'transport_unavailable',
])

export const AdminCoreNodeSchema = z
  .object({
    id: z.string().uuid(),
    cluster_id: z.string().uuid(),
    name: NonEmptyStringSchema,
    management_host: NonEmptyStringSchema,
    state: ClusterStateSchema,
    core_version: z.string().default(''),
    enrolled: z.boolean(),
    enrolled_at: TimestampSchema.nullable(),
    last_seen_at: TimestampSchema.nullable(),
    desired_revision: z.number().int().positive().nullable(),
    desired_expires_at: TimestampSchema.nullable(),
    minimum_core_version: z.string().default(''),
    applied_revision: z.number().int().positive().nullable(),
    health_status: z.enum(['', 'unknown', 'healthy', 'degraded', 'error']),
    version_compatible: z.boolean().nullable(),
    current_peers: NonNegativeIntegerSchema.nullable(),
    max_peers: NonNegativeIntegerSchema.nullable(),
    transport_states: z.record(z.string(), AdminNodeTransportStateSchema).default({}),
    last_error_code: z.string().regex(/^$|^[a-z0-9_]{1,64}$/),
    observed_at: TimestampSchema.nullable(),
    server_id: z.string().uuid().nullable(),
    server_name: z.string().default(''),
    placement_ready: z.boolean(),
    placement_reason: PlacementReasonSchema,
    created_at: TimestampSchema,
    updated_at: TimestampSchema,
  })
  .refine(
    (node) =>
      (node.current_peers === null && node.max_peers === null) ||
      (node.current_peers !== null &&
        node.max_peers !== null &&
        node.current_peers <= node.max_peers),
    { message: 'Observed node capacity is inconsistent' },
  )
  .refine((node) => node.enrolled === (node.enrolled_at !== null), {
    message: 'Node enrollment state is inconsistent',
  })
  .refine((node) => node.placement_ready === (node.placement_reason === 'ready'), {
    message: 'Placement readiness and reason disagree',
  })

export type AdminCoreNode = z.infer<typeof AdminCoreNodeSchema>
export const AdminCoreNodePageSchema = pageSchema(AdminCoreNodeSchema)
export type AdminCoreNodePage = z.infer<typeof AdminCoreNodePageSchema>

export const NodeEnrollmentTokenSchema = z.object({
  node_id: z.string().uuid(),
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  expires_at: TimestampSchema,
})
export type NodeEnrollmentToken = z.infer<typeof NodeEnrollmentTokenSchema>

// ─── Operational health ───────────────────────────────────

export const HealthCheckSchema = z.object({
  status: z.enum(['ok', 'error']),
  latency_ms: NonNegativeNumberSchema.optional(),
  interface: NonEmptyStringSchema.optional(),
})

export const HealthResponseSchema = z.object({
  status: z.enum(['ready', 'degraded']),
  checks: z.object({
    postgres: HealthCheckSchema.optional(),
    wireguard: HealthCheckSchema.optional(),
    redis: HealthCheckSchema.optional(),
  }),
})

export type HealthResponse = z.infer<typeof HealthResponseSchema>

export const HealthEnvelopeSchema = z.object({
  ok: z.literal(true),
  data: HealthResponseSchema,
})

// ─── Trusted browser-extension origins ───────────────────

export const ExtensionOriginSchema = z.object({
  id: NonEmptyStringSchema,
  origin: NonEmptyStringSchema,
  revoked: z.boolean(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
})

export type ExtensionOrigin = z.infer<typeof ExtensionOriginSchema>
export const ExtensionOriginListSchema = z.array(ExtensionOriginSchema)
export const ExtensionOriginPageSchema = pageSchema(ExtensionOriginSchema)
export type ExtensionOriginPage = z.infer<typeof ExtensionOriginPageSchema>
