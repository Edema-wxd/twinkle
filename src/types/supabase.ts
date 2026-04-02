// This file is manually maintained until Supabase CLI type generation is set up.
// DB migration required: ALTER TABLE products ADD COLUMN seo_description TEXT NULL;
// To regenerate: npx supabase gen types typescript --project-id "$SUPABASE_PROJECT_REF" --schema public > src/types/supabase.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          name: string
          slug: string
          description: string
          seo_description: string | null
          image: string
          images: string[]
          material: string
          is_featured: boolean
          is_active: boolean
          price_min: number
          price_max: number
          variants: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'seo_description'> & {
          id?: string
          created_at?: string
          seo_description?: string | null
        }
        Update: Partial<Database['public']['Tables']['products']['Insert']>
        Relationships: []
      }
      reviews: {
        Row: {
          id: string
          product_id: string
          author_name: string
          body: string
          rating: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['reviews']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          created_at: string
          paystack_reference: string
          paystack_payload: Json
          status: string
          customer_name: string
          customer_email: string
          customer_phone: string
          customer_ip: string | null
          delivery_address: string
          delivery_state: string
          shipping_cost: number
          subtotal: number
          total: number
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
          status?: string
        }
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          created_at: string
          product_id: string
          product_name: string
          variant_id: string
          variant_name: string
          tier_qty: number
          thread_colour: string | null
          unit_price: number
          quantity: number
          line_total: number
        }
        Insert: Omit<Database['public']['Tables']['order_items']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      // DDL: CREATE TABLE about_sections (id text PRIMARY KEY, title text NOT NULL, body text NOT NULL,
      //   image_url text, display_order integer NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
      // RLS: public SELECT; service-role INSERT/UPDATE/DELETE
      about_sections: {
        Row: {
          id: string                  // text PK — 'founder-story' | 'brand-mission' | 'why-loc-beads' | 'contact'
          title: string
          body: string                // Tiptap HTML
          image_url: string | null
          display_order: number
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['about_sections']['Row'], 'updated_at'> & {
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['about_sections']['Insert']>
        Relationships: []
      }
      // DDL: CREATE TABLE faqs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), category text NOT NULL,
      //   question text NOT NULL, answer text NOT NULL, display_order integer NOT NULL,
      //   created_at timestamptz NOT NULL DEFAULT now());
      // RLS: public SELECT; service-role INSERT/UPDATE/DELETE
      faqs: {
        Row: {
          id: string                  // uuid
          category: string
          question: string
          answer: string              // plain text
          display_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['faqs']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['faqs']['Insert']>
        Relationships: []
      }
      // DDL: CREATE TABLE blog_posts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL,
      //   slug text NOT NULL UNIQUE, body text NOT NULL, excerpt text NOT NULL,
      //   featured_image text, tag text, published boolean NOT NULL DEFAULT false,
      //   published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
      //   updated_at timestamptz NOT NULL DEFAULT now());
      // RLS: public SELECT WHERE published = true; service-role full access
      blog_posts: {
        Row: {
          id: string                  // uuid
          title: string
          slug: string
          body: string                // Tiptap HTML
          excerpt: string
          featured_image: string | null
          tag: string | null          // freeform, no separate categories table
          published: boolean
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['blog_posts']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['blog_posts']['Insert']>
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          id: string
          first_name: string
          email: string
          source_page: string | null
          subscribed_at: string
        }
        Insert: Omit<Database['public']['Tables']['newsletter_subscribers']['Row'], 'id' | 'subscribed_at'> & {
          id?: string
          subscribed_at?: string
        }
        Update: Partial<Database['public']['Tables']['newsletter_subscribers']['Insert']>
        Relationships: []
      }
      // DDL: see supabase/migrations/20260402_abandoned_orders.sql
      abandoned_orders: {
        Row: {
          id: string
          created_at: string
          customer_name: string
          customer_email: string
          customer_phone: string
          delivery_address: string
          delivery_state: string
          shipping_cost: number
          subtotal: number
          total: number
          cart_items: Json
          recovered: boolean
          recovered_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['abandoned_orders']['Row'], 'id' | 'created_at' | 'recovered' | 'recovered_at'> & {
          id?: string
          created_at?: string
          recovered?: boolean
          recovered_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['abandoned_orders']['Insert']>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Order = Database['public']['Tables']['orders']['Row']
export type OrderInsert = Database['public']['Tables']['orders']['Insert']
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type OrderItemInsert = Database['public']['Tables']['order_items']['Insert']
export type Product = Database['public']['Tables']['products']['Row']
export type Setting = Database['public']['Tables']['settings']['Row']
export type AboutSection = Database['public']['Tables']['about_sections']['Row']
export type Faq = Database['public']['Tables']['faqs']['Row']
export type FaqInsert = Database['public']['Tables']['faqs']['Insert']
export type BlogPost = Database['public']['Tables']['blog_posts']['Row']
export type BlogPostInsert = Database['public']['Tables']['blog_posts']['Insert']
export type NewsletterSubscriber = Database['public']['Tables']['newsletter_subscribers']['Row']
export type AbandonedOrder = Database['public']['Tables']['abandoned_orders']['Row']
export type AbandonedOrderInsert = Database['public']['Tables']['abandoned_orders']['Insert']
