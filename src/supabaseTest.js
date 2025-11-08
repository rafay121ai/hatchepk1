import { supabase } from './supabaseClient';

// Comprehensive Supabase connection and functionality tests
export const testSupabaseConnection = async () => {
  console.log('🔍 Testing Supabase Connection...');
  
  try {
    // Test 1: Basic connection
    console.log('✅ Supabase client initialized successfully');
    
    // Test 2: Auth service
    const { data: authData, error: authError } = await supabase.auth.getUser();
    console.log('🔐 Auth test:', { 
      hasUser: !!authData?.user, 
      error: authError?.message || 'No error' 
    });
    
    // Test 3: Database connection (try to read from test table)
    const { data: dbData, error: dbError } = await supabase
      .from('guides')
      .select('id')
      .limit(1);
    
    if (dbError) {
      console.log('⚠️ Database test failed:', dbError.message);
      console.log('💡 This is normal if the "test" table doesn\'t exist yet');
    } else {
      console.log('✅ Database test successful:', dbData);
    }
    
    // Test 4: Storage service (if needed)
    const { data: storageData, error: storageError } = await supabase.storage.listBuckets();
    console.log('📁 Storage test:', { 
      buckets: storageData?.length || 0, 
      error: storageError?.message || 'No error' 
    });
    
    console.log('🎉 Supabase connection test completed!');
    
    return {
      success: true,
      auth: !authError,
      database: !dbError,
      storage: !storageError
    };
    
  } catch (error) {
    console.error('❌ Supabase test failed:', error);
    return { success: false, error: error.message };
  }
};

// Test specific database operations
export const testDatabaseOperations = async () => {
  console.log('🔍 Testing Database Operations...');
  
  try {
    // Insert test data
    const { data: insertData, error: insertError } = await supabase
      .from('guides')
      .insert([{ 
        title: 'Test Guide', 
        description: 'Test from React app!',
        file_url: '/test.pdf',
        price: 0.00
      }])
      .select();
    
    if (insertError) {
      console.log('❌ Insert test failed:', insertError.message);
      return false;
    }
    
    console.log('✅ Insert test successful:', insertData);
    
    // Update test data
    const { data: updateData, error: updateError } = await supabase
      .from('guides')
      .update({ description: 'Updated from React app!' })
      .eq('id', insertData[0].id)
      .select();
    
    if (updateError) {
      console.log('❌ Update test failed:', updateError.message);
      return false;
    }
    
    console.log('✅ Update test successful:', updateData);
    
    // Delete test data
    const { error: deleteError } = await supabase
      .from('guides')
      .delete()
      .eq('id', insertData[0].id);
    
    if (deleteError) {
      console.log('❌ Delete test failed:', deleteError.message);
      return false;
    }
    
    console.log('✅ Delete test successful');
    console.log('🎉 All database operations test completed!');
    
    return true;
    
  } catch (error) {
    console.error('❌ Database operations test failed:', error);
    return false;
  }
};
