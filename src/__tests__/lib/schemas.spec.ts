import { describe, it, expect } from 'vitest'
import {
  TokenResponseSchema,
  UserSchema,
  ServerSchema,
  ConnectionSchema,
  ConnectionConfigSchema,
  DeviceSchema,
  DeviceSessionPageSchema,
  AdminStatsSchema,
  AuditLogSchema,
  AdminPeerSchema,
} from '@/lib/schemas'

describe('Zod API schemas', () => {
  describe('TokenResponseSchema', () => {
    it('parses a valid token response', () => {
      const data = {
        access_token: 'eyJhbGciOiJI...',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'refresh-abc',
      }
      expect(() => TokenResponseSchema.parse(data)).not.toThrow()
    })

    it('rejects missing access_token', () => {
      expect(() => TokenResponseSchema.parse({ token_type: 'Bearer', expires_in: 3600 })).toThrow()
    })
  })

  describe('UserSchema', () => {
    const validUser = {
      id: 'uuid-1',
      authentik_uid: 'ak-uid',
      email: 'user@test.com',
      display_name: 'Test User',
      groups: ['plan-basic'],
      is_banned: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    it('parses a valid user', () => {
      expect(() => UserSchema.parse(validUser)).not.toThrow()
    })

    it('rejects missing email', () => {
      const incomplete: Partial<typeof validUser> = { ...validUser }
      delete incomplete.email
      expect(() => UserSchema.parse(incomplete)).toThrow()
    })

    it('rejects non-array groups', () => {
      expect(() => UserSchema.parse({ ...validUser, groups: 'not-array' })).toThrow()
    })
  })

  describe('ServerSchema', () => {
    const validServer = {
      id: 'uuid-2',
      name: 'EU-West',
      host: '10.0.0.1',
      port: 8080,
      wg_port: 51820,
      public_key: 'pubkey123',
      location: 'Frankfurt',
      country_code: 'DE',
      max_peers: 100,
      current_peers: 42,
      is_active: true,
      transports: [
        {
          protocol: 'wireguard',
          host: 'vpn.example.test',
          port: 51820,
          enabled: true,
          priority: 100,
          health_status: 'healthy',
          metadata: {},
        },
      ],
    }

    it('parses a valid server', () => {
      expect(() => ServerSchema.parse(validServer)).not.toThrow()
    })

    it('rejects string port', () => {
      expect(() => ServerSchema.parse({ ...validServer, port: '8080' })).toThrow()
    })
  })

  describe('ConnectionSchema', () => {
    it('accepts null last_handshake', () => {
      const conn = {
        id: 'uuid-3',
        server_id: 'uuid-2',
        public_key: 'pk',
        assigned_ip: '10.8.0.2/32',
        device_name: 'laptop',
        is_active: true,
        bytes_sent: 1024,
        bytes_received: 2048,
        last_handshake: null,
        created_at: '2024-01-01T00:00:00Z',
      }
      expect(() => ConnectionSchema.parse(conn)).not.toThrow()
    })

    it('accepts string last_handshake', () => {
      const conn = {
        id: 'uuid-3',
        server_id: 'uuid-2',
        public_key: 'pk',
        assigned_ip: '10.8.0.2/32',
        device_name: 'laptop',
        is_active: true,
        bytes_sent: 1024,
        bytes_received: 2048,
        last_handshake: '2024-06-15T10:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      }
      expect(() => ConnectionSchema.parse(conn)).not.toThrow()
    })

    it('does not expose a preshared key from connection listings', () => {
      const parsed = ConnectionSchema.parse({
        id: 'uuid-3',
        server_id: 'uuid-2',
        public_key: 'pk',
        preshared_key: 'must-not-reach-the-view',
        assigned_ip: '10.8.0.2/32',
        device_name: 'laptop',
        is_active: true,
        bytes_sent: 0,
        bytes_received: 0,
        last_handshake: null,
        created_at: '2024-01-01T00:00:00Z',
      })

      expect(parsed).not.toHaveProperty('preshared_key')
    })
  })

  describe('ConnectionConfigSchema', () => {
    it('parses a valid config', () => {
      const cfg = {
        peer_id: 'uuid-4',
        device_id: 'device-4',
        peer_ip: '10.8.0.5',
        server_public_key: 'spk',
        server_endpoint: '1.2.3.4:51820',
        dns: '1.1.1.1',
        allowed_ips: '0.0.0.0/0',
      }
      expect(() => ConnectionConfigSchema.parse(cfg)).not.toThrow()
    })
  })

  describe('DeviceSchema', () => {
    const connection = {
      id: 'peer-1',
      device_id: 'device-1',
      server_id: 'server-1',
      protocol: 'wireguard' as const,
      public_key: 'public-key',
      assigned_ip: '10.8.0.2/32',
      is_active: true,
      bytes_sent: 10,
      bytes_received: 20,
      last_handshake: null,
      created_at: '2026-09-03T00:00:00Z',
      expires_at: null,
    }

    it('parses one stable device with its active session', () => {
      const parsed = DeviceSchema.parse({
        id: 'device-1',
        client_instance_id: 'client-1',
        reported_name: 'Tecno-09',
        alias: 'Laptop',
        display_name: 'Laptop',
        device_type: 'desktop',
        adapter_reference: 'net-v1:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        adapter_label: 'LAN · 7F3A91C2',
        first_seen_at: '2026-09-02T00:00:00Z',
        last_seen_at: '2026-09-03T00:00:00Z',
        revoked_at: null,
        status: 'connected',
        active_connection: connection,
      })
      expect(parsed.active_connection?.id).toBe('peer-1')
      expect(parsed.display_name).toBe('Laptop')
    })

    it('rejects a partial active session without replacing valid data', () => {
      expect(() => DeviceSchema.parse({
        id: 'device-1',
        client_instance_id: null,
        reported_name: 'Legacy',
        alias: '',
        display_name: 'Legacy',
        device_type: 'manual',
        adapter_reference: '',
        adapter_label: '',
        first_seen_at: '2026-09-02T00:00:00Z',
        last_seen_at: '2026-09-03T00:00:00Z',
        revoked_at: null,
        status: 'connected',
        active_connection: { id: 'partial' },
      })).toThrow()
    })

    it('parses paginated history', () => {
      const parsed = DeviceSessionPageSchema.parse({ items: [connection], page: 1, page_size: 10, total: 1 })
      expect(parsed.items).toHaveLength(1)
    })
  })

  describe('AdminStatsSchema', () => {
    it('parses valid stats', () => {
      const stats = {
        total_users: 100,
        total_servers: 5,
        active_servers: 4,
        total_peers: 200,
        active_peers: 150,
        total_bytes_sent: 1073741824,
        total_bytes_received: 2147483648,
      }
      expect(() => AdminStatsSchema.parse(stats)).not.toThrow()
    })
  })

  describe('AuditLogSchema', () => {
    it('parses a valid audit log', () => {
      const log = {
        id: 'uuid-5',
        action: 'peer.connect',
        metadata: { server: 'EU-West', ip: '10.0.0.1' },
        ip_address: '192.168.x.x',
        created_at: '2024-01-01T00:00:00Z',
      }
      expect(() => AuditLogSchema.parse(log)).not.toThrow()
    })
  })

  describe('AdminPeerSchema', () => {
    it('parses with optional expires_at', () => {
      const peer = {
        id: 'uuid-6',
        user_id: 'uuid-1',
        server_id: 'uuid-2',
        public_key: 'pk',
        assigned_ip: '10.8.0.10/32',
        device_name: 'phone',
        is_active: true,
        bytes_sent: 512,
        bytes_received: 1024,
        last_handshake: null,
        created_at: '2024-01-01T00:00:00Z',
      }
      expect(() => AdminPeerSchema.parse(peer)).not.toThrow()
    })
  })
})
