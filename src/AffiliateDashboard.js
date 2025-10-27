import React, { useState, useEffect } from 'react';
import { getAffiliateStats, getRecentConversions, getPayoutHistory } from './conversionUtils';
import { useAuth } from './AuthContext';
import { supabase } from './supabaseClient';

function AffiliateDashboard() {
  const { user } = useAuth();
  const [affiliateRefId, setAffiliateRefId] = useState(null);
  const [affiliateData, setAffiliateData] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentConversions, setRecentConversions] = useState([]);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        let refId = null;
        
        // Only show dashboard to logged-in approved affiliates
        if (user?.email) {
          const { data: affiliate, error: affiliateError } = await supabase
            .from('affiliates')
            .select('ref_id, status, tier, tier_name, commission, name')
            .eq('email', user.email)
            .eq('status', 'approved')
            .maybeSingle();

          if (!affiliateError && affiliate) {
            console.log('User is an approved affiliate:', affiliate);
            setAffiliateData(affiliate);
            refId = affiliate.ref_id;
          }
        }
        
        // Don't show dashboard to people who just clicked referral links
        // Only approved affiliates should see this dashboard
        
        setAffiliateRefId(refId);

        if (refId) {
          // Load all dashboard data
          const [statsResult, conversionsResult, payoutsResult] = await Promise.all([
            getAffiliateStats(refId),
            getRecentConversions(refId, 5),
            getPayoutHistory(refId)
          ]);

          if (statsResult.success) setStats(statsResult.stats);
          if (conversionsResult.success) setRecentConversions(conversionsResult.conversions);
          if (payoutsResult.success) setPayoutHistory(payoutsResult.payouts);
          
          // Also fetch payout summary from payouts table
          try {
            const { data: payoutData, error: payoutError } = await supabase
              .from('payouts')
              .select('*')
              .eq('affiliate_ref_id', refId)
              .maybeSingle();
              
            if (!payoutError && payoutData) {
              console.log('Payout data found:', payoutData);
              // Add payout info to stats
              setStats(prev => ({
                ...prev,
                total_payout_amount: payoutData.total_commission || 0,
                payout_status: payoutData.status || 'pending'
              }));
            }
          } catch (err) {
            console.error('Error fetching payout data:', err);
          }
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading dashboard...</div>
      </div>
    );
  }

  if (!affiliateRefId) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Affiliate Dashboard</h2>
        {!user ? (
          <p>Please log in to access your affiliate dashboard.</p>
        ) : (
          <div>
            <p>This dashboard is only available to approved affiliates.</p>
            <p>You are not currently an approved affiliate.</p>
            <p>If you have applied to become an affiliate, your application may still be under review.</p>
            <p>Visit our <a href="/affiliate-program" style={{ color: '#73160f' }}>Affiliate Program</a> page to learn more or apply.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Affiliate Dashboard</h1>
      
      {/* Affiliate Info */}
      {affiliateData && (
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px', 
          padding: '20px', 
          marginBottom: '20px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#2c2c2c' }}>Your Affiliate Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <strong>Name:</strong> {affiliateData.name || user?.name || 'N/A'}
            </div>
            <div>
              <strong>Email:</strong> {user?.email}
            </div>
            <div>
              <strong>Referral ID:</strong> {affiliateRefId}
            </div>
            <div>
              <strong>Tier:</strong> {affiliateData.tier_name || affiliateData.tier}
            </div>
            <div>
              <strong>Commission Rate:</strong> {affiliateData.commission}%
            </div>
            <div>
              <strong>Status:</strong> <span style={{ color: '#28a745', fontWeight: 'bold' }}>Approved</span>
            </div>
          </div>
        </div>
      )}
      
      <p><strong>Your Referral ID:</strong> {affiliateRefId}</p>
      
      {/* Key Metrics - Highlighted */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '20px', 
          marginBottom: '30px' 
        }}>
          {/* People Who Bought Through Your Link */}
          <div style={{ 
            padding: '25px', 
            backgroundColor: '#e3f2fd', 
            borderRadius: '12px',
            border: '2px solid #2196f3',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>People Who Bought</h3>
            <div style={{ fontSize: '3em', fontWeight: 'bold', color: '#1976d2', marginBottom: '5px' }}>
              {stats.total_conversions || 0}
            </div>
            <p style={{ margin: '0', color: '#666', fontSize: '0.9em' }}>
              Through your referral link
            </p>
          </div>
          
          {/* Total Payout Amount */}
          <div style={{ 
            padding: '25px', 
            backgroundColor: '#e8f5e8', 
            borderRadius: '12px',
            border: '2px solid #4caf50',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#388e3c' }}>Total Payout</h3>
            <div style={{ fontSize: '3em', fontWeight: 'bold', color: '#388e3c', marginBottom: '5px' }}>
              PKR {stats.total_commission_earned || 0}
            </div>
            <p style={{ margin: '0', color: '#666', fontSize: '0.9em' }}>
              Commission earned
            </p>
          </div>
          
          {/* Payout Status */}
          <div style={{ 
            padding: '25px', 
            backgroundColor: '#fff3e0', 
            borderRadius: '12px',
            border: '2px solid #ff9800',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#f57c00' }}>Payout Status</h3>
            <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#f57c00', marginBottom: '5px' }}>
              {stats.pending_conversions || 0} Pending
            </div>
            <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#4caf50', marginBottom: '5px' }}>
              {stats.approved_conversions || 0} Approved
            </div>
            <p style={{ margin: '0', color: '#666', fontSize: '0.9em' }}>
              Conversion status
            </p>
          </div>
        </div>
      )}

      {/* Payout Summary */}
      {stats && (
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          borderRadius: '12px', 
          padding: '25px', 
          marginBottom: '30px',
          border: '1px solid #dee2e6'
        }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#2c2c2c' }}>Payout Summary</h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '20px' 
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#28a745', marginBottom: '5px' }}>
                PKR {stats.total_commission_earned || 0}
              </div>
              <div style={{ color: '#666', fontSize: '0.9em' }}>Ready for Payout</div>
              <div style={{ color: '#28a745', fontSize: '0.8em', marginTop: '5px' }}>
                ({stats.approved_conversions || 0} approved conversions)
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#ff9800', marginBottom: '5px' }}>
                PKR {stats.pending_commission_amount || 0}
              </div>
              <div style={{ color: '#666', fontSize: '0.9em' }}>Pending Review</div>
              <div style={{ color: '#ff9800', fontSize: '0.8em', marginTop: '5px' }}>
                ({stats.pending_conversions || 0} pending conversions)
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#dc3545', marginBottom: '5px' }}>
                PKR {stats.rejected_commission_amount || 0}
              </div>
              <div style={{ color: '#666', fontSize: '0.9em' }}>Rejected</div>
              <div style={{ color: '#dc3545', fontSize: '0.8em', marginTop: '5px' }}>
                ({stats.rejected_conversions || 0} rejected conversions)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Stats */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '15px', 
          marginBottom: '30px' 
        }}>
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#6c757d' }}>Total Sales</h4>
            <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#17a2b8' }}>
              PKR {stats.total_sales_amount || 0}
            </div>
          </div>
          
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#6c757d' }}>Rejected</h4>
            <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#dc3545' }}>
              {stats.rejected_conversions || 0}
            </div>
          </div>
        </div>
      )}

      {/* Recent Conversions */}
      {recentConversions.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h2>Recent Conversions</h2>
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            border: '1px solid #dee2e6',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f8f9fa' }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Customer</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Product</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Sale Amount</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Commission</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentConversions.map((conversion) => (
                  <tr key={conversion.id}>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      {new Date(conversion.conversion_date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      {conversion.customer_name || conversion.customer_email}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      {conversion.product_name}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      PKR {conversion.product_price}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      PKR {conversion.commission_amount}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.8em',
                        backgroundColor: conversion.status === 'approved' ? '#d4edda' : 
                                        conversion.status === 'rejected' ? '#f8d7da' : '#fff3cd',
                        color: conversion.status === 'approved' ? '#155724' : 
                               conversion.status === 'rejected' ? '#721c24' : '#856404'
                      }}>
                        {conversion.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payout History */}
      {payoutHistory.length > 0 && (
        <div>
          <h2>Payout History</h2>
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            border: '1px solid #dee2e6',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f8f9fa' }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Payout Date</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Total Commission</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Payout Amount</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {payoutHistory.map((payout) => (
                  <tr key={payout.id}>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      {payout.payout_date ? new Date(payout.payout_date).toLocaleDateString() : 'Pending'}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      PKR {payout.total_commission}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      PKR {payout.payout_amount}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.8em',
                        backgroundColor: payout.status === 'paid' ? '#d4edda' : 
                                        payout.status === 'failed' ? '#f8d7da' : '#fff3cd',
                        color: payout.status === 'paid' ? '#155724' : 
                               payout.status === 'failed' ? '#721c24' : '#856404'
                      }}>
                        {payout.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AffiliateDashboard;
