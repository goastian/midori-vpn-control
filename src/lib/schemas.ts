import { z } from 'zod'

const NonNegativeIntegerSchema = z.number().int().nonnegative()
const NonNegativeNumberSchema = z.number().finite().nonnegative()
const NonEmptyStringSchema = z.string().min(1)
const TimestampSchema = NonEmptyStringSchema.refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Invalid timestamp',
})

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

export const ServerSchema = z.object({
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  host: NonEmptyStringSchema,
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

export const ServerPingResultSchema = z.object({
  server_id: NonEmptyStringSchema,
  latency_ms: NonNegativeNumberSchema,
  available: z.boolean(),
})

export type ServerPingResult = z.infer<typeof ServerPingResultSchema>
export const ServerPingResultListSchema = z.array(ServerPingResultSchema)

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

export const DeviceSessionPageSchema = z.object({
  items: z.array(DeviceConnectionSchema),
  page: z.number().int().min(1),
  page_size: z.number().int().min(1).max(100),
  total: NonNegativeIntegerSchema,
})

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

// ─── Admin Peer ───────────────────────────────────────────

export const AdminPeerSchema = ConnectionSchema.extend({
  user_id: NonEmptyStringSchema,
  user_email: z.string().default(''),
  expires_at: TimestampSchema.nullable().optional(),
})

export type AdminPeer = z.infer<typeof AdminPeerSchema>
export const AdminPeerListSchema = z.array(AdminPeerSchema)

export const AdminUserDetailSchema = z.object({
  user: UserSchema,
  peers: AdminPeerListSchema,
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
