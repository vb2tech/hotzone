import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'your-supabase-url'
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types based on your inventory management schema
export interface Zone {
  id: string
  name: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface Container {
  id: string
  name: string
  user_id: string
  zone_id: string
  created_at: string
  updated_at: string
}

// Base interface for both cards and comics
export interface BaseItem {
  id: string
  user_id: string
  container_id: string
  created_at: string
  updated_at: string
  grade: number | null
  condition: string | null
  quantity: number
}

export interface Card extends BaseItem {
  player: string
  team: string
  manufacturer: string
  sport: string
  year: number
  number: string
  number_out_of: number | null
  is_rookie: boolean
  price: number | null
  cost: number | null
}

export interface Comic extends BaseItem {
  title: string
  publisher: string
  issue: number
  year: number
  price: number | null
  cost: number | null
}

// Union type for items
export type Item = Card | Comic
