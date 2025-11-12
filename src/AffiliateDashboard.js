import React, { useState, useEffect } from 'react';
import { getAffiliateStats, getRecentConversions, getPayoutHistory } from './conversionUtils';
import { useAuth } from './AuthContext';
import { supabase } from './supabaseClient';
import './affiliate.css';

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
        
        if (user?.email) {
          const { data: affiliate, error: affiliateError } = await supabase
            .from('affiliates')
            .select('ref_id, referral_url, status, tier, tier_name, commission, name')
            .eq('email', user.email)
            .eq('status', 'approved')
            .maybeSingle();

          if (!affiliateError && affiliate) {
            setAffiliateData(affiliate);
            refId = affiliate.ref_id;
          }
        }
        
        setAffiliateRefId(refId);

        if (refId) {
          const [statsResult, conversionsResult, payoutsResult] = await Promise.all([
            getAffiliateStats(refId),
            getRecentConversions(refId, 5),
            getPayoutHistory(refId)
          ]);

          if (statsResult.success) setStats(statsResult.stats);
          if (conversionsResult.success) setRecentConversions(conversionsResult.conversions);
          if (payoutsResult.success) setPayoutHistory(payoutsResult.payouts);
          
          try {
            const { data: payoutData, error: payoutError } = await supabase
              .from('payouts')
              .select('*')
              .eq('affiliate_ref_id', refId)
              .maybeSingle();
              
            if (!payoutError && payoutData) {
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
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (!affiliateRefId) {
    return (
      <div className="dashboard-empty">
        <div className="empty-content">
          <div className="empty-icon">🎯</div>
          <h2>Affiliate Dashboard</h2>
          {!user ? (
            <p>Please log in to access your affiliate dashboard.</p>
          ) : (
            <div>
              <p>This dashboard is only available to approved affiliates.</p>
              <p>You are not currently an approved affiliate.</p>
              <p>If you have applied to become an affiliate, your application may still be under review.</p>
              <a href="/affiliate-program" className="apply-link">
                Apply to Affiliate Program →
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Calculate conversion rate
  const conversionRate = stats && stats.total_conversions 
    ? ((stats.approved_conversions / stats.total_conversions) * 100).toFixed(1)
    : 0;

  return (
    <div className="affiliate-dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h1>Affiliate Dashboard</h1>
            <p className="dashboard-subtitle">Welcome back, {affiliateData?.name || user?.email}!</p>
          </div>
          <div className="referral-badge">
            <span className="badge-label">Your Referral Link</span>
            <span className="badge-value">{affiliateData?.referral_url || `https://hatchepk.com?ref=${affiliateRefId}`}</span>
            <button 
              className="copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(affiliateData?.referral_url || `https://hatchepk.com?ref=${affiliateRefId}`);
                alert('Referral link copied to clipboard!');
              }}
            >
              📋 Copy Link
            </button>
          </div>
        </div>

        {/* Affiliate Info Card */}
        {affiliateData && (
          <div className="info-card">
            <h3>Your Affiliate Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Name</span>
                <span className="info-value">{affiliateData.name || user?.name || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email</span>
                <span className="info-value">{user?.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Tier</span>
                <span className="info-value">{affiliateData.tier_name || affiliateData.tier}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Commission Rate</span>
                <span className="info-value">{affiliateData.commission}%</span>
              </div>
              <div className="info-item">
                <span className="info-label">Status</span>
                <span className="status-badge status-approved">Approved</span>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics Cards */}
        {stats && (
          <div className="metrics-grid">
            {/* Total Conversions */}
            <div className="metric-card metric-primary">
              <div className="metric-icon">👥</div>
              <div className="metric-content">
                <h3 className="metric-label">People Who Bought</h3>
                <div className="metric-value">{stats.total_conversions || 0}</div>
                <p className="metric-description">Through your referral link</p>
              </div>
              <div className="metric-chart">
                <div 
                  className="chart-bar" 
                  style={{ width: `${Math.min((stats.total_conversions / 10) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Total Earnings */}
            <div className="metric-card metric-success">
              <div className="metric-icon">💰</div>
              <div className="metric-content">
                <h3 className="metric-label">Total Earnings</h3>
                <div className="metric-value">PKR {stats.total_commission_earned || 0}</div>
                <p className="metric-description">Commission earned</p>
              </div>
              <div className="metric-trend metric-trend-up">
                ↑ {conversionRate}% conversion rate
              </div>
            </div>

            {/* Pending Conversions */}
            <div className="metric-card metric-warning">
              <div className="metric-icon">⏳</div>
              <div className="metric-content">
                <h3 className="metric-label">Pending Review</h3>
                <div className="metric-value">{stats.pending_conversions || 0}</div>
                <p className="metric-description">Awaiting approval</p>
              </div>
              <div className="metric-amount">
                PKR {stats.pending_commission_amount || 0}
              </div>
            </div>

            {/* Approved Conversions */}
            <div className="metric-card metric-info">
              <div className="metric-icon">✅</div>
              <div className="metric-content">
                <h3 className="metric-label">Approved</h3>
                <div className="metric-value">{stats.approved_conversions || 0}</div>
                <p className="metric-description">Ready for payout</p>
              </div>
              <div className="metric-amount metric-amount-success">
                PKR {stats.total_commission_earned || 0}
              </div>
            </div>
          </div>
        )}

        {/* Payout Summary with Visual Graph */}
        {stats && (
          <div className="payout-summary-card">
            <h2>Payout Summary</h2>
            <div className="payout-grid">
              <div className="payout-item payout-approved">
                <div className="payout-label">Ready for Payout</div>
                <div className="payout-value">PKR {stats.total_commission_earned || 0}</div>
                <div className="payout-detail">
                  {stats.approved_conversions || 0} approved conversions
                </div>
                <div className="payout-bar">
                  <div 
                    className="payout-bar-fill payout-bar-approved"
                    style={{ 
                      width: `${(stats.total_commission_earned / (stats.total_commission_earned + stats.pending_commission_amount + stats.rejected_commission_amount || 1)) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>

              <div className="payout-item payout-pending">
                <div className="payout-label">Pending Review</div>
                <div className="payout-value">PKR {stats.pending_commission_amount || 0}</div>
                <div className="payout-detail">
                  {stats.pending_conversions || 0} pending conversions
                </div>
                <div className="payout-bar">
                  <div 
                    className="payout-bar-fill payout-bar-pending"
                    style={{ 
                      width: `${(stats.pending_commission_amount / (stats.total_commission_earned + stats.pending_commission_amount + stats.rejected_commission_amount || 1)) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>

              <div className="payout-item payout-rejected">
                <div className="payout-label">Rejected</div>
                <div className="payout-value">PKR {stats.rejected_commission_amount || 0}</div>
                <div className="payout-detail">
                  {stats.rejected_conversions || 0} rejected conversions
                </div>
                <div className="payout-bar">
                  <div 
                    className="payout-bar-fill payout-bar-rejected"
                    style={{ 
                      width: `${(stats.rejected_commission_amount / (stats.total_commission_earned + stats.pending_commission_amount + stats.rejected_commission_amount || 1)) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Additional Stats */}
        {stats && (
          <div className="additional-stats">
            <div className="stat-box">
              <div className="stat-icon">💵</div>
              <div className="stat-content">
                <div className="stat-label">Total Sales</div>
                <div className="stat-value">PKR {stats.total_sales_amount || 0}</div>
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-icon">❌</div>
              <div className="stat-content">
                <div className="stat-label">Rejected</div>
                <div className="stat-value">{stats.rejected_conversions || 0}</div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Conversions Table */}
        {recentConversions.length > 0 && (
          <div className="conversions-section">
            <h2>Recent Conversions</h2>
            <div className="table-container">
              <table className="conversions-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Sale</th>
                    <th>Commission</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentConversions.map((conversion) => (
                    <tr key={conversion.id}>
                      <td data-label="Date">
                        {new Date(conversion.conversion_date).toLocaleDateString()}
                      </td>
                      <td data-label="Customer">
                        {conversion.customer_name || conversion.customer_email}
                      </td>
                      <td data-label="Product">{conversion.product_name}</td>
                      <td data-label="Sale">PKR {conversion.product_price}</td>
                      <td data-label="Commission">
                        <strong>PKR {conversion.commission_amount}</strong>
                      </td>
                      <td data-label="Status">
                        <span className={`status-badge status-${conversion.status}`}>
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

        {/* Payout History Table */}
        {payoutHistory.length > 0 && (
          <div className="payouts-section">
            <h2>Payout History</h2>
            <div className="table-container">
              <table className="payouts-table">
                <thead>
                  <tr>
                    <th>Payout Date</th>
                    <th>Total Commission</th>
                    <th>Payout Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payoutHistory.map((payout) => (
                    <tr key={payout.id}>
                      <td data-label="Payout Date">
                        {payout.payout_date ? new Date(payout.payout_date).toLocaleDateString() : 'Pending'}
                      </td>
                      <td data-label="Total Commission">PKR {payout.total_commission}</td>
                      <td data-label="Payout Amount">
                        <strong>PKR {payout.payout_amount}</strong>
                      </td>
                      <td data-label="Status">
                        <span className={`status-badge status-${payout.status}`}>
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
    </div>
  );
}

export default AffiliateDashboard;
