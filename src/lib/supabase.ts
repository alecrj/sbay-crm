import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Service role client that bypasses RLS - only use in API routes
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase // Fallback to regular client if service key not available

// Database Types
export interface Property {
  id: string
  title: string
  type: 'warehouse' | 'office' | 'industrial' | 'flex-space' | 'distribution'
  property_type?: 'single' | 'multi_unit'
  parent_property_id?: string
  location: string
  county?: 'Miami-Dade' | 'Broward' | 'Palm Beach' | 'St. Lucie' | 'Okeechobee'
  price: string
  size: string
  available: boolean
  featured: boolean
  description?: string
  image?: string
  gallery?: any
  features?: any
  street_address?: string
  city?: string
  state?: string
  zip_code?: string
  lease_term?: string
  clear_height?: string
  loading_docks?: number
  parking?: number
  year_built?: number
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  title: string
  type: 'consultation' | 'property-inquiry' | 'general-inquiry' | 'contact-form'
  status: 'new' | 'contacted' | 'no-reply' | 'showing-completed' | 'won' | 'lost'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  lead_score?: 'low' | 'medium' | 'high'
  name: string
  email: string
  phone?: string
  company?: string
  property_interest?: string
  property_id?: string
  space_requirements?: string
  budget?: string
  timeline?: string
  message?: string
  source: 'website' | 'referral' | 'cold-call' | 'email-campaign' | 'social-media' | 'trade-show' | 'other'
  consultation_date?: string
  consultation_time?: string
  follow_up_date?: string
  internal_notes?: string
  assigned_to?: string
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  lead_id?: string
  title: string
  description?: string
  start_time: string
  end_time: string
  location?: string
  attendees: string[]
  google_calendar_event_id?: string
  reminder_24h_sent: boolean
  reminder_2h_sent: boolean
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'agent' | 'assistant'
  avatar?: string
  phone?: string
  created_at: string
  updated_at: string
}