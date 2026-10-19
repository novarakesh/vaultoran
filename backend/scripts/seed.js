const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const config = require('../src/config/env');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');

const seedUsers = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await connectDB();

    console.log('[Seed] Seeding initial TrustVault role accounts...');

    const defaultAccounts = [
      {
        name: 'SecOps Administrator',
        email: config.seed.adminEmail,
        password: config.seed.adminPassword,
        role: 'admin',
      },
      {
        name: 'Document Owner Alice',
        email: config.seed.ownerEmail,
        password: config.seed.ownerPassword,
        role: 'owner',
      },
      {
        name: 'Auditor Viewer Bob',
        email: config.seed.viewer1Email,
        password: config.seed.viewer1Password,
        role: 'viewer',
      },
      {
        name: 'Guest Viewer Charlie',
        email: config.seed.viewer2Email,
        password: config.seed.viewer2Password,
        role: 'viewer',
      },
    ];

    for (const acc of defaultAccounts) {
      const passwordHash = await User.hashPassword(acc.password);
      const existingUser = await User.findOne({ email: acc.email.toLowerCase() });

      if (existingUser) {
        existingUser.name = acc.name;
        existingUser.passwordHash = passwordHash;
        existingUser.role = acc.role;
        existingUser.tokenVersion = 0;
        await existingUser.save();
        console.log(`[Seed] Updated existing account: ${acc.email} (${acc.role})`);
      } else {
        await User.create({
          name: acc.name,
          email: acc.email.toLowerCase(),
          passwordHash,
          role: acc.role,
          tokenVersion: 0,
        });
        console.log(`[Seed] Created new account: ${acc.email} (${acc.role})`);
      }
    }

    console.log('\n[Seed Completed Successfully]');
    console.log('---------------------------------------------------------');
    console.log(`Admin Account:   ${config.seed.adminEmail}  [Role: admin]`);
    console.log(`Owner Account:   ${config.seed.ownerEmail}  [Role: owner]`);
    console.log(`Viewer 1 Account: ${config.seed.viewer1Email} [Role: viewer]`);
    console.log(`Viewer 2 Account: ${config.seed.viewer2Email} [Role: viewer]`);
    console.log('---------------------------------------------------------');

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    await disconnectDB();
    process.exit(1);
  }
};

seedUsers();
