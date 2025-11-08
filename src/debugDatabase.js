import { supabase } from './supabaseClient';

// Simple test function to debug database access
export const testDatabaseAccess = async () => {
  console.log('🔍 Starting database access test...');
  
  // Test 1: Basic Supabase connection
  console.log('Test 1: Basic connection...');
  try {
    const { data, error } = await supabase.auth.getUser();
    console.log('✅ Auth user:', data.user?.email || 'No user');
    console.log('❌ Auth error:', error);
  } catch (err) {
    console.error('❌ Auth test failed:', err);
  }
  
  // Test 2: Test guides table
  console.log('Test 2: Guides table...');
  try {
    const { data, error } = await supabase.from('guides').select('count').limit(1);
    console.log('✅ Guides table accessible:', data);
    console.log('❌ Guides error:', error);
  } catch (err) {
    console.error('❌ Guides test failed:', err);
  }
  
  // Test 3: Test user_sessions table (with timeout)
  console.log('Test 3: User sessions table...');
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout after 3 seconds')), 3000)
    );
    
    const queryPromise = supabase.from('user_sessions').select('*').limit(1);
    
    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
    console.log('✅ User sessions accessible:', data);
    console.log('❌ User sessions error:', error);
  } catch (err) {
    console.error('❌ User sessions test failed:', err);
  }
  
  // Test 4: Test inserting into user_sessions
  console.log('Test 4: Insert test...');
  try {
    const testData = {
      user_id: 'test-user-id',
      device_id: 'test-device-id',
      device_info: 'test-device',
      is_active: true,
      last_activity: new Date().toISOString(),
    };
    
    const { data, error } = await supabase.from('user_sessions').insert(testData);
    console.log('✅ Insert successful:', data);
    console.log('❌ Insert error:', error);
  } catch (err) {
    console.error('❌ Insert test failed:', err);
  }
  
  console.log('🏁 Database access test complete');
};

// Make it available globally for console testing
window.testDatabaseAccess = testDatabaseAccess;
