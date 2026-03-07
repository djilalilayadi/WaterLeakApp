import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://cwslsjkccmormduuxflt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_8ZfCa7z9ZiZJKVOoWnQzKQ_lyYDr2pi';

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
