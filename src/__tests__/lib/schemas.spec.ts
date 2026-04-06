import { describe, it, expect } from 'vitest'
import {
  TokenResponseSchema,
  UserSchema,
  ServerSchema,
  ConnectionSchema,
  ConnectionConfigSchema,
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
      const { email, ...incomplete } = validUser
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
  })

  describe('ConnectionConfigSchema', () => {
    it('parses a valid config', () => {
      const cfg = {
        peer_id: 'uuid-4',
        peer_ip: '10.8.0.5',
        server_public_key: 'spk',
        server_endpoint: '1.2.3.4:51820',
        dns: '1.1.1.1',
        allowed_ips: '0.0.0.0/0',
      }
      expect(() => ConnectionConfigSchema.parse(cfg)).not.toThrow()
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
