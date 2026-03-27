import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 관리자 API 호출용 (서버사이드 대신 service_role key 사용 — Vercel Edge Function 권장)
// 이 파일에서는 anon key로 RLS 적용된 쿼리만 실행
export default supabase
