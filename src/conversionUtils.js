import { supabase } from './supabaseClient';

/**
 * Track a conversion when someone makes a purchase through an affiliate link
 * @param {Object} conversionData - The conversion data
 * @param {string} conversionData.customerEmail - Customer's email
 * @param {string} conversionData.customerName - Customer's name (optional)
 * @param {string} conversionData.productName - Name of the product purchased
 * @param {number} conversionData.productPrice - Price of the product
 * @param {string} conversionData.orderId - Order ID (optional)
 * @returns {Promise<Object>} - Result of the conversion tracking
 */
export const trackConversion = async (conversionData) => {
  try {
    // Get the stored referral ID from localStorage
    const affiliateRefId = localStorage.getItem('hatche_referral_id');
    
    if (!affiliateRefId) {
      console.log('No affiliate referral ID found - this is not an affiliate conversion');
      return { success: false, message: 'No affiliate referral ID found' };
    }

    // Get affiliate information to determine commission rate
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('tier, commission, email')
      .eq('ref_id', affiliateRefId)
      .single();

    if (affiliateError || !affiliate.ok) {
      console.error('Error fetching affiliate data:', affiliateError);
      return { success: false, message: 'Affiliate not found' };
    }

    // Calculate commission
    const commissionRate = parseFloat(affiliate.commission.replace('%', ''));
    const commissionAmount = (conversionData.productPrice * commissionRate) / 100;

    // Insert conversion record
    const { data, error } = await supabase
      .from('conversions')
      .insert([
        {
          affiliate_ref_id: affiliateRefId,
          customer_email: conversionData.customerEmail,
          purchase_amount: conversionData.productPrice,
          commission_rate: commissionRate,
          commission_amount: commissionAmount
        }
      ])
      .select();

    if (error) {
      console.error('Error tracking conversion:', error);
      return { success: false, message: 'Failed to track conversion' };
    }

    console.log('Conversion tracked successfully:', {
      affiliateRefId,
      customerEmail: conversionData.customerEmail,
      productPrice: conversionData.productPrice,
      commissionAmount
    });

    return { 
      success: true, 
      data: data[0],
      commissionAmount,
      affiliateRefId
    };

  } catch (error) {
    console.error('Error in trackConversion:', error);
    return { success: false, message: 'Internal error' };
  }
};

/**
 * Get conversion statistics for an affiliate
 * @param {string} affiliateRefId - The affiliate's reference ID
 * @returns {Promise<Object>} - Conversion statistics
 */
export const getAffiliateStats = async (affiliateRefId) => {
  try {
    const { data, error } = await supabase
      .from('conversions')
      .select('*')
      .eq('affiliate_ref_id', affiliateRefId);

    if (error) {
      console.error('Error fetching affiliate stats:', error);
      return { success: false, message: 'Failed to fetch stats' };
    }

    const stats = {
      total_conversions: data.length,
      pending_conversions: data.filter(c => c.status === 'pending').length,
      approved_conversions: data.filter(c => c.status === 'approved').length,
      rejected_conversions: data.filter(c => c.status === 'rejected').length,
      total_sales_amount: data.reduce((sum, c) => sum + parseFloat(c.purchase_amount || 0), 0),
      total_commission_earned: data
        .filter(c => c.status === 'approved')
        .reduce((sum, c) => sum + parseFloat(c.commission_amount || 0), 0)
    };

    return { success: true, stats };
  } catch (error) {
    console.error('Error in getAffiliateStats:', error);
    return { success: false, message: 'Internal error' };
  }
};

/**
 * Get total earnings for an affiliate
 * @param {string} affiliateRefId - The affiliate's reference ID
 * @returns {Promise<Object>} - Total earnings data
 */
export const getAffiliateEarnings = async (affiliateRefId) => {
  try {
    const { data, error } = await supabase
      .from('conversions')
      .select('*')
      .eq('affiliate_ref_id', affiliateRefId)
      .eq('status', 'approved');

    if (error) {
      console.error('Error fetching affiliate earnings:', error);
      return { success: false, message: 'Failed to fetch earnings' };
    }

    const earnings = {
      total_conversions: data.length,
      total_sales_amount: data.reduce((sum, c) => sum + parseFloat(c.purchase_amount || 0), 0),
      total_commission_earned: data.reduce((sum, c) => sum + parseFloat(c.commission_amount || 0), 0)
    };

    return { success: true, earnings };
  } catch (error) {
    console.error('Error in getAffiliateEarnings:', error);
    return { success: false, message: 'Internal error' };
  }
};

/**
 * Get recent conversions for an affiliate
 * @param {string} affiliateRefId - The affiliate's reference ID
 * @param {number} limit - Number of recent conversions to fetch (default: 10)
 * @returns {Promise<Object>} - Recent conversions
 */
export const getRecentConversions = async (affiliateRefId, limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('conversions')
      .select('*')
      .eq('affiliate_ref_id', affiliateRefId)
      .order('conversion_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent conversions:', error);
      return { success: false, message: 'Failed to fetch conversions' };
    }

    // Transform data to match dashboard expectations
    const transformedData = data.map(conversion => ({
      ...conversion,
      product_name: `Purchase ($${conversion.purchase_amount})`,
      product_price: conversion.purchase_amount,
      customer_name: conversion.customer_email
    }));

    return { success: true, conversions: transformedData };
  } catch (error) {
    console.error('Error in getRecentConversions:', error);
    return { success: false, message: 'Internal error' };
  }
};

/**
 * Approve or reject a conversion (admin function)
 * @param {number} conversionId - The conversion ID
 * @param {string} status - 'approved' or 'rejected'
 * @returns {Promise<Object>} - Result of the status update
 */
export const updateConversionStatus = async (conversionId, status) => {
  try {
    const { data, error } = await supabase
      .from('conversions')
      .update({ status })
      .eq('id', conversionId)
      .select();

    if (error) {
      console.error('Error updating conversion status:', error);
      return { success: false, message: 'Failed to update status' };
    }

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error in updateConversionStatus:', error);
    return { success: false, message: 'Internal error' };
  }
};

/**
 * Create a payout record for an affiliate
 * @param {Object} payoutData - The payout data
 * @param {string} payoutData.affiliateRefId - Affiliate's reference ID
 * @param {number} payoutData.totalCommission - Total commission earned
 * @param {number} payoutData.payoutAmount - Amount to payout
 * @returns {Promise<Object>} - Result of the payout creation
 */
export const createPayout = async (payoutData) => {
  try {
    const { data, error } = await supabase
      .from('payouts')
      .insert([
        {
          affiliate_ref_id: payoutData.affiliateRefId,
          total_commission: payoutData.totalCommission,
          payout_amount: payoutData.payoutAmount,
          status: 'pending'
        }
      ])
      .select();

    if (error) {
      console.error('Error creating payout:', error);
      return { success: false, message: 'Failed to create payout' };
    }

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error in createPayout:', error);
    return { success: false, message: 'Internal error' };
  }
};

/**
 * Get payout history for an affiliate
 * @param {string} affiliateRefId - The affiliate's reference ID
 * @returns {Promise<Object>} - Payout history
 */
export const getPayoutHistory = async (affiliateRefId) => {
  try {
    const { data, error } = await supabase
      .from('payouts')
      .select('*')
      .eq('affiliate_ref_id', affiliateRefId)
      .order('payout_date', { ascending: false });

    if (error) {
      console.error('Error fetching payout history:', error);
      return { success: false, message: 'Failed to fetch payout history' };
    }

    return { success: true, payouts: data };
  } catch (error) {
    console.error('Error in getPayoutHistory:', error);
    return { success: false, message: 'Internal error' };
  }
};
