import { supabase } from './supabaseClient';

// Utility functions for database operations

export const addGuideToDatabase = async (guideData) => {
  try {
    const { data, error } = await supabase
      .from('guides')
      .insert([guideData])
      .select();

    if (error) {
      console.error('Error adding guide:', error);
      return { success: false, error };
    }

    console.log('Guide added successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error adding guide:', error);
    return { success: false, error };
  }
};

export const getAllGuides = async () => {
  try {
    const { data, error } = await supabase
      .from('guides')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching guides:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching guides:', error);
    return { success: false, error };
  }
};

export const getUserPurchases = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('purchases')
      .select(`
        *,
        guides (
          id,
          title,
          description,
          file_url,
          price
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching purchases:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return { success: false, error };
  }
};

// Sample guide data to add to database
export const sampleGuide = {
  title: "The Creator Gold Rush for Pakistani Women",
  description: "A comprehensive guide for Pakistani women to build successful online businesses and become content creators in the digital economy. Learn how to monetize your skills, build a personal brand, and create sustainable income streams through digital platforms.",
  file_url: "/preview.pdf",
  price: 29.99
};

// Function to initialize database with sample data
export const initializeDatabase = async () => {
  try {
    // Check if guides already exist
    const { data: existingGuides } = await supabase
      .from('guides')
      .select('*');

    if (existingGuides && existingGuides.length > 0) {
      console.log('Database already has guides:', existingGuides);
      return { success: true, message: 'Database already initialized' };
    }

    // Add sample guide
    const result = await addGuideToDatabase(sampleGuide);
    
    if (result.success) {
      console.log('Database initialized successfully with sample guide');
      return { success: true, message: 'Database initialized successfully' };
    } else {
      console.error('Failed to initialize database:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    return { success: false, error };
  }
};
