import React, { useState, useEffect } from 'react';
import { getAffiliateStats, getRecentConversions, getPayoutHistory } from './conversionUtils';
import { getStoredReferralId } from './referralUtils';

function AffiliateDashboard() {
  const [affiliateRefId, setAffiliateRefId] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentConversions, setRecentConversions] = useState([]);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Get stored referral ID
        const storedRefId = getStoredReferralId();
        setAffiliateRefId(storedRefId);

        if (storedRefId) {
          // Load all dashboard data
          const [statsResult, conversionsResult, payoutsResult] = await Promise.all([
            getAffiliateStats(storedRefId),
            getRecentConversions(storedRefId, 5),
            getPayoutHistory(storedRefId)
          ]);

          if (statsResult.success) setStats(statsResult.stats);
          if (conversionsResult.success) setRecentConversions(conversionsResult.conversions);
          if (payoutsResult.success) setPayoutHistory(payoutsResult.payouts);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

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
        <p>No affiliate referral ID found. Please visit through an affiliate link to access the dashboard.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Affiliate Dashboard</h1>
      <p><strong>Your Referral ID:</strong> {affiliateRefId}</p>
      
      {/* Stats Overview */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px', 
          marginBottom: '30px' 
        }}>
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <h3>Total Conversions</h3>
            <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#007bff' }}>
              {stats.total_conversions || 0}
            </div>
          </div>
          
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <h3>Approved Conversions</h3>
            <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#28a745' }}>
              {stats.approved_conversions || 0}
            </div>
          </div>
          
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <h3>Total Sales</h3>
            <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#17a2b8' }}>
              ${stats.total_sales_amount || 0}
            </div>
          </div>
          
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <h3>Total Earnings</h3>
            <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#28a745' }}>
              ${stats.total_commission_earned || 0}
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
                      ${conversion.product_price}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      ${conversion.commission_amount}
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
                      ${payout.total_commission}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      ${payout.payout_amount}
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
