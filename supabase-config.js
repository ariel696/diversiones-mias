// Traemos la función que necesitamos desde la librería de Supabase.
// No hace falta instalar nada: el navegador la descarga sola.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 👇👇👇 PEGÁ ACÁ TUS DATOS 👇👇👇
// Los sacás de: Supabase → tu proyecto → ícono de engranaje "Project Settings"
// → "Data API" (antes se llamaba "API")
// - "Project URL"       -> pegalo en supabaseUrl
// - "anon public" key   -> pegalo en supabaseKey (NO uses la "service_role", esa es secreta)
const supabaseUrl = "https://wiiqrrefsffeikcinfmu.supabase.co";
const supabaseKey = "sb_publishable_Essdb-wPK81nfEj4urfWCA_eD2lu4m-";

// Exportamos "supabase" para poder usarlo en categoria.js
export const supabase = createClient(supabaseUrl, supabaseKey);
