import { EncryptionService } from '../services/EncryptionService';

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;

  beforeEach(() => {
    // Use a test key for consistent testing
    const testKey = 'test-encryption-key-32-chars-long';
    encryptionService = new EncryptionService(testKey);
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt simple text', () => {
      const originalText = 'Hello, World!';
      const encrypted = encryptionService.encrypt(originalText);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(encrypted).not.toBe(originalText);
      expect(decrypted).toBe(originalText);
    });

    it('should encrypt and decrypt complex text with special characters', () => {
      const originalText = 'Password123!@#$%^&*()_+{}|:"<>?[]\\;\',./ ñáéíóú';
      const encrypted = encryptionService.encrypt(originalText);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(encrypted).not.toBe(originalText);
      expect(decrypted).toBe(originalText);
    });

    it('should produce different encrypted values for the same input', () => {
      const originalText = 'Same input text';
      const encrypted1 = encryptionService.encrypt(originalText);
      const encrypted2 = encryptionService.encrypt(originalText);

      expect(encrypted1).not.toBe(encrypted2);
      expect(encryptionService.decrypt(encrypted1)).toBe(originalText);
      expect(encryptionService.decrypt(encrypted2)).toBe(originalText);
    });

    it('should handle empty strings', () => {
      const originalText = '';
      const encrypted = encryptionService.encrypt(originalText);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(originalText);
    });

    it('should handle long text', () => {
      const originalText = 'A'.repeat(10000);
      const encrypted = encryptionService.encrypt(originalText);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(originalText);
    });
  });

  describe('encryptCredentials and decryptCredentials', () => {
    it('should encrypt and decrypt credential objects', () => {
      const credentials = {
        username: 'testuser',
        password: 'testpass123',
        apiKey: 'api_key_12345',
        additionalField: 'extra_data'
      };

      const encrypted = encryptionService.encryptCredentials(credentials);
      const decrypted = encryptionService.decryptCredentials(encrypted);

      expect(encrypted).not.toContain('testuser');
      expect(encrypted).not.toContain('testpass123');
      expect(decrypted).toEqual(credentials);
    });

    it('should handle nested objects in credentials', () => {
      const credentials = {
        username: 'testuser',
        oauth: {
          accessToken: 'access_token_123',
          refreshToken: 'refresh_token_456',
          expiresAt: new Date().toISOString()
        },
        metadata: {
          lastLogin: '2023-01-01',
          preferences: ['pref1', 'pref2']
        }
      };

      const encrypted = encryptionService.encryptCredentials(credentials);
      const decrypted = encryptionService.decryptCredentials(encrypted);

      expect(decrypted).toEqual(credentials);
    });

    it('should handle empty credential objects', () => {
      const credentials = {};
      const encrypted = encryptionService.encryptCredentials(credentials);
      const decrypted = encryptionService.decryptCredentials(encrypted);

      expect(decrypted).toEqual(credentials);
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid encrypted data in decrypt', () => {
      expect(() => {
        encryptionService.decrypt('invalid_encrypted_data');
      }).toThrow('Decryption failed');
    });

    it('should throw error for malformed base64 in decrypt', () => {
      expect(() => {
        encryptionService.decrypt('not_base64!@#$');
      }).toThrow('Decryption failed');
    });

    it('should throw error for invalid JSON in decryptCredentials', () => {
      const invalidEncrypted = encryptionService.encrypt('not valid json {');
      expect(() => {
        encryptionService.decryptCredentials(invalidEncrypted);
      }).toThrow('Decryption failed');
    });
  });

  describe('generateKey', () => {
    it('should generate a valid hex key', () => {
      const key = EncryptionService.generateKey();
      
      expect(key).toMatch(/^[0-9a-f]{64}$/); // 32 bytes = 64 hex characters
      expect(key.length).toBe(64);
    });

    it('should generate different keys each time', () => {
      const key1 = EncryptionService.generateKey();
      const key2 = EncryptionService.generateKey();
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('different encryption instances', () => {
    it('should not be able to decrypt data encrypted with different keys', () => {
      const service1 = new EncryptionService('key1-32-chars-long-for-testing');
      const service2 = new EncryptionService('key2-32-chars-long-for-testing');
      
      const originalText = 'Secret message';
      const encrypted = service1.encrypt(originalText);
      
      expect(() => {
        service2.decrypt(encrypted);
      }).toThrow('Decryption failed');
    });

    it('should work with same key across different instances', () => {
      const sharedKey = 'shared-key-32-chars-long-for-test';
      const service1 = new EncryptionService(sharedKey);
      const service2 = new EncryptionService(sharedKey);
      
      const originalText = 'Shared secret';
      const encrypted = service1.encrypt(originalText);
      const decrypted = service2.decrypt(encrypted);
      
      expect(decrypted).toBe(originalText);
    });
  });
});