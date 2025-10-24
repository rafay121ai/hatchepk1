import { createClient } from "@supabase/supabase-js";

const supabaseUrl = 'https://smlmbqgqkijodbxfpqen.supabase.co';
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtbG1icWdxa2lqb2RieGZwcWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDIxOTQsImV4cCI6MjA3NjgxODE5NH0.FBFN5O8rZIPx0DJTFPto6VokT_VgLZiJeCQcWkLej1w";

export const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey
  );
