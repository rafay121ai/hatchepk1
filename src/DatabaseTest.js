import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function DatabaseTest() {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const results = [];

    try {
      // Test 1: Check Supabase connection
      results.push('Testing Supabase connection...');
      const { data: testData, error: testError } = await supabase
        .from('orders')
        .select('count')
        .limit(1);
      
      if (testError) {
        results.push(`❌ Connection failed: ${testError.message}`);
      } else {
        results.push('✅ Supabase connection successful');
      }

      // Test 2: Check if orders table exists and get structure
      results.push('Checking orders table structure...');
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .limit(1);
      
      if (ordersError) {
        results.push(`❌ Orders table error: ${ordersError.message}`);
      } else {
        results.push('✅ Orders table accessible');
        if (orders && orders.length > 0) {
          results.push(`📋 Sample order columns: ${Object.keys(orders[0]).join(', ')}`);
        } else {
          results.push('📋 Orders table is empty');
        }
      }

      // Test 3: Check if guides table exists
      results.push('Checking guides table...');
      const { data: guides, error: guidesError } = await supabase
        .from('guides')
        .select('*')
        .limit(1);
      
      if (guidesError) {
        results.push(`❌ Guides table error: ${guidesError.message}`);
      } else {
        results.push('✅ Guides table accessible');
        if (guides && guides.length > 0) {
          results.push(`📋 Sample guide columns: ${Object.keys(guides[0]).join(', ')}`);
        } else {
          results.push('📋 Guides table is empty');
        }
      }

      // Test 4: Try to insert a test order
      results.push('Testing order insertion...');
      const testOrder = {
        customer_email: 'test@example.com',
        customer_name: 'Test User',
        product_name: 'Test Guide',
        guide_id: 1,
        amount: 29.99,
        by_ref_id: null,
        order_status: 'completed',
      };

      const { data: insertData, error: insertError } = await supabase
        .from('orders')
        .insert(testOrder);

      if (insertError) {
        results.push(`❌ Order insertion failed: ${insertError.message}`);
      } else {
        results.push('✅ Order insertion successful');
        results.push(`📋 Inserted order ID: ${insertData?.[0]?.id || 'Unknown'}`);
        
        // Clean up test order
        if (insertData && insertData[0] && insertData[0].id) {
          await supabase
            .from('orders')
            .delete()
            .eq('id', insertData[0].id);
          results.push('🧹 Test order cleaned up');
        }
      }

    } catch (error) {
      results.push(`❌ Unexpected error: ${error.message}`);
    }

    setTestResults(results);
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Database Connection Test</h1>
      <button 
        onClick={runTests} 
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#73160f',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Running Tests...' : 'Run Database Tests'}
      </button>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Test Results:</h3>
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '5px',
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace'
        }}>
          {testResults.length > 0 ? testResults.join('\n') : 'No tests run yet'}
        </pre>
      </div>
    </div>
  );
}

export default DatabaseTest;
