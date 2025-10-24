import { supabase } from './supabaseClient';

async function registerDevice(user, guideId) {
  const deviceId = localStorage.getItem('device_id') || crypto.randomUUID();
  localStorage.setItem('device_id', deviceId);

  const deviceInfo = navigator.userAgent;

  await supabase.from('user_sessions').upsert([
    {
      user_id: user.id,
      device_id: deviceId,
      device_info: deviceInfo,
      is_active: true,
      last_activity: new Date().toISOString(),
    },
  ], {
    onConflict: ['user_id', 'device_id']
  });

  // Skip purchase record insertion to avoid conflicts
  // This is handled by the orders table instead
  console.log('Skipping purchase record insertion to avoid database conflicts');
}

async function enforceSessionLimit(user) {
  // Use user_sessions table instead of purchases table
  const { data } = await supabase
    .from('user_sessions')
    .select('device_id')
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (data && data.length > 2) {
    alert('Too many devices logged in. You\'ll be logged out.');
    await supabase.auth.signOut();
    window.location.href = '/login';
  }
}

export { registerDevice, enforceSessionLimit };
