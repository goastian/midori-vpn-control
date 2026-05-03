import { z } from 'zod'

// ─── Auth ─────────────────────────────────────────────────

export const TokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  id_token: z.string().optional(),
})

export type TokenResponse = z.infer<typeof TokenResponseSchema>

// ─── User ─────────────────────────────────────────────────

export const UserSchema = z.object({
  id: z.string(),
  authentik_uid: z.string(),
  email: z.string(),
  display_name: z.string(),
  groups: z.array(z.string()),
  is_banned: z.boolean(),
  banned_at: z.string().nullable().optional(),
  ban_reason: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
})

export type User = z.infer<typeof UserSchema>

// ─── Server ───────────────────────────────────────────────

export const ServerSchema = z.object({
  id: z.string(),
  name: z.string(),
  host: z.string(),
  endpoint: z.string().optional().default(''),
  port: z.number(),
  wg_port: z.number(),
  public_key: z.string(),
  core_token: z.string().optional(),
  location: z.string(),
  country_code: z.string(),
  max_peers: z.number(),
  current_peers: z.number(),
  is_active: z.boolean(),
})

export type Server = z.infer<typeof ServerSchema>

// ─── Connection / Peer ────────────────────────────────────

export const ConnectionSchema = z.object({
  id: z.string(),
  server_id: z.string(),
  public_key: z.string(),
  assigned_ip: z.string(),
  device_name: z.string(),
  is_active: z.boolean(),
  bytes_sent: z.number(),
  bytes_received: z.number(),
  last_handshake: z.string().nullable(),
  created_at: z.string(),
})

export type Connection = z.infer<typeof ConnectionSchema>

export const ConnectionConfigSchema = z.object({
  peer_id: z.string(),
  peer_ip: z.string(),
  server_public_key: z.string(),
  server_endpoint: z.string(),
  dns: z.string(),
  allowed_ips: z.string(),
})

export type ConnectionConfig = z.infer<typeof ConnectionConfigSchema>

// ─── Admin Stats ──────────────────────────────────────────

export const AdminStatsSchema = z.object({
  total_users: z.number(),
  total_servers: z.number(),
  active_servers: z.number(),
  total_peers: z.number(),
  active_peers: z.number(),
  total_bytes_sent: z.number(),
  total_bytes_received: z.number(),
})

export type AdminStats = z.infer<typeof AdminStatsSchema>

// ─── Audit Log ────────────────────────────────────────────

export const AuditLogSchema = z.object({
  id: z.string(),
  user_id: z.string().nullable().optional(),
  action: z.string(),
  metadata: z.record(z.string(), z.unknown()),
  ip_address: z.string(),
  created_at: z.string(),
})

export type AuditLog = z.infer<typeof AuditLogSchema>

// ─── Admin Peer ───────────────────────────────────────────

export const AdminPeerSchema = ConnectionSchema.extend({
  user_id: z.string(),
  expires_at: z.string().nullable().optional(),
})

export type AdminPeer = z.infer<typeof AdminPeerSchema>

// ─── Admin Mesh ───────────────────────────────────────────

export const AdminMeshMemberSchema = z.object({
  mesh_ip: z.string(),
  display_name: z.string(),
  email: z.string(),
  user_id: z.string(),
  connected: z.boolean(),
  joined_at: z.string(),
})

export type AdminMeshMember = z.infer<typeof AdminMeshMemberSchema>

export const AdminMeshNetworkSchema = z.object({
  id: z.string(),
  name: z.string(),
  subnet: z.string(),
  is_active: z.boolean(),
  member_count: z.number(),
  created_at: z.string(),
  members: z.array(AdminMeshMemberSchema),
})

export type AdminMeshNetwork = z.infer<typeof AdminMeshNetworkSchema>
