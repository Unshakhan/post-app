import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

let SUPABASE_URL = "https://romirqjgtqxauwtwbuws.supabase.co";
let SUPABASE_ANON_KEY = "sb_publishable_ZB40eb0Xp5UUfechlfD1Rw_khwnI72o";
var supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase