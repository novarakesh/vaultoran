const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_high_entropy_32_characters_long_key';
process.env.STORAGE_DIR = path.join(__dirname, 'test-storage');

const app = require('../src/app');
const config = require('../src/config/env');
const User = require('../src/models/User');
const Document = require('../src/models/Document');
const AuditLog = require('../src/models/AuditLog');
const { computeFileHash } = require('../src/utils/hash');

let mongoServer;
let adminUser, ownerUser1, ownerUser2, viewerNoShare, viewerWithRead;
let adminToken, owner1Token, owner2Token, viewerNoShareToken, viewerReadToken;
let testDoc, testFilePath, testFileHash;

const testStorageDir = path.join(__dirname, 'test-storage');

beforeAll(async () => {
  // 1. Initialize MongoDB in-memory server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // 2. Prepare test storage directory
  if (!fs.existsSync(testStorageDir)) {
    fs.mkdirSync(testStorageDir, { recursive: true });
  }
  config.storageDir = testStorageDir;

  // 3. Create test users with hashed passwords
  const passwordHash = await User.hashPassword('TestSecret#2026');

  adminUser = await User.create({
    name: 'Admin User',
    email: 'admin@test.io',
    passwordHash,
    role: 'admin',
    tokenVersion: 0,
  });

  ownerUser1 = await User.create({
    name: 'Owner User 1',
    email: 'owner1@test.io',
    passwordHash,
    role: 'owner',
    tokenVersion: 0,
  });

  ownerUser2 = await User.create({
    name: 'Owner User 2',
    email: 'owner2@test.io',
    passwordHash,
    role: 'owner',
    tokenVersion: 0,
  });

  viewerNoShare = await User.create({
    name: 'Viewer Without Share',
    email: 'viewernoshare@test.io',
    passwordHash,
    role: 'viewer',
    tokenVersion: 0,
  });

  viewerWithRead = await User.create({
    name: 'Viewer With Read',
    email: 'viewerread@test.io',
    passwordHash,
    role: 'viewer',
    tokenVersion: 0,
  });

  // 4. Generate JWT tokens
  const sign = (user) =>
    jwt.sign({ id: user._id, role: user.role, tokenVersion: user.tokenVersion }, config.jwtSecret, {
      expiresIn: '1h',
    });

  adminToken = sign(adminUser);
  owner1Token = sign(ownerUser1);
  owner2Token = sign(ownerUser2);
  viewerNoShareToken = sign(viewerNoShare);
  viewerReadToken = sign(viewerWithRead);

  // 5. Create a test file in storage and compute its hash
  const randomFileName = `${crypto.randomBytes(16).toString('hex')}.pdf`;
  testFilePath = path.join(testStorageDir, randomFileName);
  const fileContent = 'TOP_SECRET_FINANCIAL_REPORTS_CONTENT_2026';
  fs.writeFileSync(testFilePath, fileContent, 'utf8');
  testFileHash = await computeFileHash(testFilePath);

  // 6. Create test Document owned by ownerUser1, shared only with viewerWithRead
  testDoc = await Document.create({
    title: 'Q4 Classified Financial Audit',
    category: 'Financial',
    owner: ownerUser1._id,
    filePath: testFilePath,
    originalName: 'Q4_Financial_Audit.pdf',
    mimeType: 'application/pdf',
    size: Buffer.byteLength(fileContent),
    fileHash: testFileHash,
    sharedWith: [
      {
        user: viewerWithRead._id,
        permission: 'read',
      },
    ],
    isDeleted: false,
  });
});

afterAll(async () => {
  // Clean up database and test files
  await mongoose.disconnect();
  await mongoServer.stop();

  if (fs.existsSync(testStorageDir)) {
    fs.rmSync(testStorageDir, { recursive: true, force: true });
  }
});

describe('TrustVault Security Architecture Test Suite', () => {
  // Test 1: Unauthenticated request returns 401
  test('1. Unauthenticated request returns 401', async () => {
    const res = await request(app).get(`/api/documents/${testDoc._id}/download`);
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/no token provided/i);
  });

  // Test 2: A viewer with no share gets 403 on download, and a VIEW_ATTEMPT_DENIED log is created
  test('2. A viewer with no share gets 403 on download, and a VIEW_ATTEMPT_DENIED log is created', async () => {
    const res = await request(app)
      .get(`/api/documents/${testDoc._id}/download`)
      .set('Authorization', `Bearer ${viewerNoShareToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/access denied/i);

    // Verify VIEW_ATTEMPT_DENIED audit log entry
    const deniedLog = await AuditLog.findOne({
      user: viewerNoShare._id,
      action: 'VIEW_ATTEMPT_DENIED',
      document: testDoc._id,
    });

    expect(deniedLog).not.toBeNull();
    expect(deniedLog.action).toBe('VIEW_ATTEMPT_DENIED');
    expect(deniedLog.user.toString()).toBe(viewerNoShare._id.toString());
  });

  // Test 3: A read-only viewer cannot edit or share (403)
  test('3. A read-only viewer cannot edit or share (403)', async () => {
    // Attempt to share
    const shareRes = await request(app)
      .put(`/api/documents/${testDoc._id}/share`)
      .set('Authorization', `Bearer ${viewerReadToken}`)
      .send({ userId: viewerNoShare._id, permission: 'read' });

    expect(shareRes.statusCode).toBe(403);

    // Attempt to edit document metadata
    const editRes = await request(app)
      .put(`/api/documents/${testDoc._id}`)
      .set('Authorization', `Bearer ${viewerReadToken}`)
      .send({ title: 'Hacked Title Attempt' });

    expect(editRes.statusCode).toBe(403);

    // Attempt to soft-delete
    const deleteRes = await request(app)
      .delete(`/api/documents/${testDoc._id}`)
      .set('Authorization', `Bearer ${viewerReadToken}`);

    expect(deleteRes.statusCode).toBe(403);
  });

  // Test 4: Owner of another document gets 403
  test('4. Owner of another document gets 403', async () => {
    const res = await request(app)
      .get(`/api/documents/${testDoc._id}/download`)
      .set('Authorization', `Bearer ${owner2Token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/access denied/i);
  });

  // Test 5: Admin and owner get 200
  test('5. Admin and owner get 200 on download', async () => {
    // Owner download
    const ownerRes = await request(app)
      .get(`/api/documents/${testDoc._id}/download`)
      .set('Authorization', `Bearer ${owner1Token}`);

    expect(ownerRes.statusCode).toBe(200);
    expect(ownerRes.headers['x-content-type-options']).toBe('nosniff');
    expect(ownerRes.headers['content-disposition']).toMatch(/attachment/);

    // Admin download
    const adminRes = await request(app)
      .get(`/api/documents/${testDoc._id}/download`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminRes.statusCode).toBe(200);
    expect(adminRes.headers['x-content-type-options']).toBe('nosniff');
  });

  // Test 6: A shared viewer gets 200
  test('6. A shared viewer gets 200', async () => {
    const res = await request(app)
      .get(`/api/documents/${testDoc._id}/download`)
      .set('Authorization', `Bearer ${viewerReadToken}`);

    expect(res.statusCode).toBe(200);
    const content = res.text || (Buffer.isBuffer(res.body) ? res.body.toString() : '');
    expect(content).toBe('TOP_SECRET_FINANCIAL_REPORTS_CONTENT_2026');
  });

  // Test 7: A stale token (after tokenVersion increment) returns 401
  test('7. A stale token (after tokenVersion increment) returns 401', async () => {
    // Generate a fresh token for ownerUser2
    const tokenBeforeRevocation = jwt.sign(
      { id: ownerUser2._id, role: ownerUser2.role, tokenVersion: ownerUser2.tokenVersion },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // Verify it works first
    const okRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenBeforeRevocation}`);
    expect(okRes.statusCode).toBe(200);

    // Increment tokenVersion (simulates logoutAll or admin revocation)
    ownerUser2.tokenVersion += 1;
    await ownerUser2.save();

    // Stale token should immediately be rejected with 401
    const revokedRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenBeforeRevocation}`);

    expect(revokedRes.statusCode).toBe(401);
    expect(revokedRes.body.error).toMatch(/session has been revoked/i);
  });

  // Test 8: AuditLog update/delete attempts throw
  test('8. AuditLog update/delete attempts throw due to append-only immutability hooks', async () => {
    // Create an audit log entry
    const log = await AuditLog.create({
      user: adminUser._id,
      action: 'LOGIN',
      ip: '127.0.0.1',
      userAgent: 'JestSecurityTest',
      metadata: { test: true },
    });

    expect(log).toBeDefined();

    // 1. Attempt updateOne
    await expect(
      AuditLog.updateOne({ _id: log._id }, { $set: { action: 'DOWNLOAD' } })
    ).rejects.toThrow(/Audit logs are strictly immutable/i);

    // 2. Attempt findOneAndUpdate
    await expect(
      AuditLog.findOneAndUpdate({ _id: log._id }, { $set: { ip: '0.0.0.0' } })
    ).rejects.toThrow(/Audit logs are strictly immutable/i);

    // 3. Attempt deleteOne
    await expect(
      AuditLog.deleteOne({ _id: log._id })
    ).rejects.toThrow(/Audit logs are strictly immutable/i);

    // 4. Attempt deleteMany
    await expect(
      AuditLog.deleteMany({ ip: '127.0.0.1' })
    ).rejects.toThrow(/Audit logs are strictly immutable/i);

    // 5. Attempt document save update
    log.action = 'UPLOAD';
    await expect(log.save()).rejects.toThrow(/Audit logs are strictly immutable/i);
  });

  // Test 9: Tampered file fails the hash integrity check
  test('9. Tampered file fails the hash integrity check', async () => {
    // Create a new document with valid file
    const tamperedFileName = `${crypto.randomBytes(16).toString('hex')}.pdf`;
    const tamperedFilePath = path.join(testStorageDir, tamperedFileName);
    fs.writeFileSync(tamperedFilePath, 'ORIGINAL_UNTOUCHED_CONTENT', 'utf8');
    const originalHash = await computeFileHash(tamperedFilePath);

    const docToTamper = await Document.create({
      title: 'Integrity Check File',
      category: 'Legal',
      owner: ownerUser1._id,
      filePath: tamperedFilePath,
      originalName: 'Contract.pdf',
      mimeType: 'application/pdf',
      size: 25,
      fileHash: originalHash,
      sharedWith: [],
      isDeleted: false,
    });

    // Maliciously alter the file on disk
    fs.writeFileSync(tamperedFilePath, 'TAMPERED_INJECTED_MALICIOUS_DATA', 'utf8');

    // Attempt download as owner
    const res = await request(app)
      .get(`/api/documents/${docToTamper._id}/download`)
      .set('Authorization', `Bearer ${owner1Token}`);

    // Must return 500 integrity check failure and not leak tampered content
    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/integrity check failed/i);
  });
});
