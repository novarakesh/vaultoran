const crypto = require('crypto');
const fs = require('fs');

/**
 * Computes SHA-256 hash of a Buffer
 * @param {Buffer} buffer
 * @returns {string} Hex-encoded SHA-256 hash
 */
const computeBufferHash = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Computes SHA-256 hash of a file on disk via streaming
 * @param {string} filePath Absolute path to file
 * @returns {Promise<string>} Hex-encoded SHA-256 hash
 */
const computeFileHash = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
};

/**
 * Verifies file integrity by checking computed hash against stored hash
 * @param {string} filePath Absolute path to file
 * @param {string} expectedHash Stored SHA-256 hash
 * @returns {Promise<boolean>} True if intact, false if tampered
 */
const verifyFileIntegrity = async (filePath, expectedHash) => {
  try {
    const actualHash = await computeFileHash(filePath);
    return actualHash.toLowerCase() === expectedHash.toLowerCase();
  } catch (error) {
    return false;
  }
};

module.exports = {
  computeBufferHash,
  computeFileHash,
  verifyFileIntegrity,
};
