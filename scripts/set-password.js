const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function setPassword() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Get email and password from command line arguments
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('❌ Usage: node scripts/set-password.js <email> <password>');
    console.error('Example: node scripts/set-password.js 99alecrodriguez@gmail.com admin123');
    process.exit(1);
  }

  try {
    console.log('🔄 Setting password for existing user...');

    // First, find the user by email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error listing users:', listError.message);
      process.exit(1);
    }

    const user = users.users.find(u => u.email === email);

    if (!user) {
      console.error('❌ User not found:', email);
      process.exit(1);
    }

    // Update the user's password
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: password
    });

    if (error) {
      console.error('❌ Error setting password:', error.message);
      process.exit(1);
    }

    console.log('✅ Password set successfully!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`👤 Role: ${user.user_metadata?.role || 'user'}`);
    console.log('\n🚀 You can now log in at: http://localhost:3002/login');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

setPassword();