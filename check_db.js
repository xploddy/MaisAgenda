
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfiles() {
    console.log("Checking profiles table...");
    try {
        const { data, error } = await supabase.from('profiles').select('*').limit(1);
        if (error) {
            console.error("Error accessing profiles:", error);
        } else {
            console.log("Profiles table accessible. Sample data:", data);
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}

checkProfiles();
