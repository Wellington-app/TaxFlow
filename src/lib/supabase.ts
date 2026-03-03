import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Diagnóstico de conexão (Aparecerá no console do navegador/inspecionar)
if (typeof window !== 'undefined') {
  console.log('--- Diagnóstico Supabase ---');
  console.log('URL configurada:', supabaseUrl ? 'Sim (' + supabaseUrl.substring(0, 15) + '...)' : 'Não');
  console.log('Chave configurada:', supabaseAnonKey ? 'Sim (Inicia com ' + supabaseAnonKey.substring(0, 10) + '...)' : 'Não');
  console.log('---------------------------');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  }
);
