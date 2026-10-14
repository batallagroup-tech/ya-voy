const { createClient } = require('@supabase/supabase-js'); try { createClient('https://qqwpfypjwdetljyzkogo.supabase.co', ''); console.log('OK'); } catch (e) { console.error(e.message); }
