import dotenv from 'dotenv';
import path from 'path';
import readline from 'readline';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { User } from '../models/User';

// Load server environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const promptQuestion = (query: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
};

const run = async () => {
  try {
    console.log('--- Initial Admin CLI Setup Script ---');

    await connectDB();

    // Check args or env vars
    const args = process.argv.slice(2);
    let email = process.env.ADMIN_EMAIL;
    let password = process.env.ADMIN_PASSWORD;
    let name = process.env.ADMIN_NAME || 'System Administrator';

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--email' && args[i + 1]) email = args[i + 1];
      if (args[i] === '--password' && args[i + 1]) password = args[i + 1];
      if (args[i] === '--name' && args[i + 1]) name = args[i + 1];
    }

    // If not provided in env or CLI args, prompt interactively if in TTY
    if (!email) {
      if (process.stdin.isTTY) {
        email = await promptQuestion('Enter Admin Email: ');
      } else {
        console.error('Error: Admin email must be provided via ADMIN_EMAIL environment variable or --email CLI argument in non-interactive mode.');
        await mongoose.disconnect();
        process.exit(1);
      }
    }
    if (!password) {
      if (process.stdin.isTTY) {
        password = await promptQuestion('Enter Admin Password: ');
      } else {
        console.error('Error: Admin password must be provided via ADMIN_PASSWORD environment variable or --password CLI argument in non-interactive mode.');
        await mongoose.disconnect();
        process.exit(1);
      }
    }

    if (!email || !email.includes('@')) {
      console.error('Error: A valid email address is required.');
      await mongoose.disconnect();
      process.exit(1);
    }

    if (!password || password.length < 6) {
      console.error('Error: Password must be at least 6 characters long.');
      await mongoose.disconnect();
      process.exit(1);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if an account with this email exists
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      console.log(`Notice: An account with email "${normalizedEmail}" already exists with role: ${existing.role}.`);
      console.log('Skipping duplicate admin creation.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create the admin user
    const admin = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      department: 'Platform Administration',
      mustChangePassword: false,
    });

    console.log(`✅ Admin account successfully created!`);
    console.log(`   ID:    ${admin._id}`);
    console.log(`   Name:  ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role:  ${admin.role}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err: any) {
    console.error('Admin setup failed:', err?.message || err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
};

run();
