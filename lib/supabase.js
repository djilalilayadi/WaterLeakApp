import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://cwslsjkccmormduuxflt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3c2xzamtjY21vcm1kdXV4Zmx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTM3MTgsImV4cCI6MjA4ODIyOTcxOH0.ZIKOakXM9SQOkA_B56Isgtwx4f8-pci2KgZjA9OKkJ8';

/**
 * Supabase client instance with persistence
 */
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

export default supabase;
