export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      availability: {
        Row: {
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean | null
          provider_id: string
          start_time: string
        }
        Insert: {
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean | null
          provider_id: string
          start_time: string
        }
        Update: {
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean | null
          provider_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_date: string
          booking_time: string
          created_at: string
          health_concern: string | null
          id: string
          notes: string | null
          patient_id: string
          provider_id: string
          service_id: string | null
          status: string
          stripe_payment_intent_id: string | null
          total_price: number
          updated_at: string
        }
        Insert: {
          booking_date: string
          booking_time: string
          created_at?: string
          health_concern?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          provider_id: string
          service_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          total_price?: number
          updated_at?: string
        }
        Update: {
          booking_date?: string
          booking_time?: string
          created_at?: string
          health_concern?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          provider_id?: string
          service_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          banner_url: string | null
          category: string
          created_at: string
          creator_id: string
          description: string | null
          display_name: string
          icon_url: string | null
          id: string
          member_count: number
          name: string
          post_count: number
          rules: Json | null
          updated_at: string
          visibility: string
        }
        Insert: {
          banner_url?: string | null
          category?: string
          created_at?: string
          creator_id: string
          description?: string | null
          display_name: string
          icon_url?: string | null
          id?: string
          member_count?: number
          name: string
          post_count?: number
          rules?: Json | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          banner_url?: string | null
          category?: string
          created_at?: string
          creator_id?: string
          description?: string | null
          display_name?: string
          icon_url?: string | null
          id?: string
          member_count?: number
          name?: string
          post_count?: number
          rules?: Json | null
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      community_members: {
        Row: {
          community_id: string
          id: string
          joined_at: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          is_request: boolean | null
          last_message_at: string
          participant_1: string
          participant_2: string
          request_sender_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_request?: boolean | null
          last_message_at?: string
          participant_1: string
          participant_2: string
          request_sender_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_request?: boolean | null
          last_message_at?: string
          participant_1?: string
          participant_2?: string
          request_sender_id?: string | null
        }
        Relationships: []
      }
      health_record_shares: {
        Row: {
          created_at: string
          id: string
          record_id: string
          shared_by: string
          shared_with: string
        }
        Insert: {
          created_at?: string
          id?: string
          record_id: string
          shared_by: string
          shared_with: string
        }
        Update: {
          created_at?: string
          id?: string
          record_id?: string
          shared_by?: string
          shared_with?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_record_shares_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "health_records"
            referencedColumns: ["id"]
          },
        ]
      }
      health_records: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          file_type: string | null
          file_url: string | null
          folder: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_type?: string | null
          file_url?: string | null
          folder?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_type?: string | null
          file_url?: string | null
          folder?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          sender_id: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          booking_cancelled: boolean | null
          booking_confirmed: boolean | null
          booking_created: boolean | null
          booking_reminder_1h: boolean | null
          booking_reminder_24h: boolean | null
          connection_request: boolean | null
          created_at: string
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          message_received: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_cancelled?: boolean | null
          booking_confirmed?: boolean | null
          booking_created?: boolean | null
          booking_reminder_1h?: boolean | null
          booking_reminder_24h?: boolean | null
          connection_request?: boolean | null
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          message_received?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_cancelled?: boolean | null
          booking_confirmed?: boolean | null
          booking_created?: boolean | null
          booking_reminder_1h?: boolean | null
          booking_reminder_24h?: boolean | null
          connection_request?: boolean | null
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          message_received?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      org_members: {
        Row: {
          created_at: string
          display_order: number
          id: string
          invited_email: string | null
          organization_id: string
          role: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          invited_email?: string | null
          organization_id: string
          role?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          invited_email?: string | null
          organization_id?: string
          role?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          banner_url: string | null
          city: string | null
          created_at: string
          description: string | null
          email: string | null
          established_year: number | null
          id: string
          is_verified: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          operating_hours: string | null
          owner_id: string
          phone: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_twitter: string | null
          specialties: string[] | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          banner_url?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          established_year?: number | null
          id?: string
          is_verified?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          operating_hours?: string | null
          owner_id: string
          phone?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_twitter?: string | null
          specialties?: string[] | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          banner_url?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          established_year?: number | null
          id?: string
          is_verified?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          operating_hours?: string | null
          owner_id?: string
          phone?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_twitter?: string | null
          specialties?: string[] | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          category: string | null
          comments_count: number
          community_id: string | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          likes_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          comments_count?: number
          community_id?: string | null
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          comments_count?: number
          community_id?: string | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          created_at: string
          dosage: string | null
          duration: string | null
          frequency: string | null
          id: string
          instructions: string | null
          medication_name: string
          prescription_id: string
        }
        Insert: {
          created_at?: string
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          medication_name: string
          prescription_id: string
        }
        Update: {
          created_at?: string
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          medication_name?: string
          prescription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          booking_id: string | null
          created_at: string
          diagnosis: string | null
          id: string
          notes: string | null
          patient_id: string
          provider_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          diagnosis?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          provider_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          diagnosis?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          certifications: Json | null
          created_at: string
          education: Json | null
          full_name: string | null
          id: string
          onboarding_completed: boolean | null
          phone: string | null
          skills: string[] | null
          updated_at: string
          user_id: string
          work_experience: Json | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          certifications?: Json | null
          created_at?: string
          education?: Json | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          phone?: string | null
          skills?: string[] | null
          updated_at?: string
          user_id: string
          work_experience?: Json | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          certifications?: Json | null
          created_at?: string
          education?: Json | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          phone?: string | null
          skills?: string[] | null
          updated_at?: string
          user_id?: string
          work_experience?: Json | null
        }
        Relationships: []
      }
      provider_profiles: {
        Row: {
          accepting_new_patients: boolean | null
          address: string | null
          avg_rating: number | null
          bio: string | null
          booking_mode: string
          certifications: string[] | null
          city: string | null
          consultation_fee: number | null
          consultation_modes: string[] | null
          created_at: string
          date_of_birth: string | null
          education: Json | null
          email: string | null
          experience_years: number | null
          gender: string | null
          home_visit_fee: number | null
          hourly_rate: number | null
          id: string
          is_available: boolean | null
          languages: string[] | null
          latitude: number | null
          license_expiry: string | null
          license_number: string | null
          location: unknown
          longitude: number | null
          organization_id: string | null
          phone: string | null
          provider_type: string
          qualifications: string[] | null
          specialization: string | null
          specializations: string[] | null
          total_reviews: number | null
          updated_at: string
          user_id: string
          verification_document_url: string | null
          verification_notes: string | null
          verification_status: string
          verification_submitted_at: string | null
          work_experience: Json | null
        }
        Insert: {
          accepting_new_patients?: boolean | null
          address?: string | null
          avg_rating?: number | null
          bio?: string | null
          booking_mode?: string
          certifications?: string[] | null
          city?: string | null
          consultation_fee?: number | null
          consultation_modes?: string[] | null
          created_at?: string
          date_of_birth?: string | null
          education?: Json | null
          email?: string | null
          experience_years?: number | null
          gender?: string | null
          home_visit_fee?: number | null
          hourly_rate?: number | null
          id?: string
          is_available?: boolean | null
          languages?: string[] | null
          latitude?: number | null
          license_expiry?: string | null
          license_number?: string | null
          location?: unknown
          longitude?: number | null
          organization_id?: string | null
          phone?: string | null
          provider_type?: string
          qualifications?: string[] | null
          specialization?: string | null
          specializations?: string[] | null
          total_reviews?: number | null
          updated_at?: string
          user_id: string
          verification_document_url?: string | null
          verification_notes?: string | null
          verification_status?: string
          verification_submitted_at?: string | null
          work_experience?: Json | null
        }
        Update: {
          accepting_new_patients?: boolean | null
          address?: string | null
          avg_rating?: number | null
          bio?: string | null
          booking_mode?: string
          certifications?: string[] | null
          city?: string | null
          consultation_fee?: number | null
          consultation_modes?: string[] | null
          created_at?: string
          date_of_birth?: string | null
          education?: Json | null
          email?: string | null
          experience_years?: number | null
          gender?: string | null
          home_visit_fee?: number | null
          hourly_rate?: number | null
          id?: string
          is_available?: boolean | null
          languages?: string[] | null
          latitude?: number | null
          license_expiry?: string | null
          license_number?: string | null
          location?: unknown
          longitude?: number | null
          organization_id?: string | null
          phone?: string | null
          provider_type?: string
          qualifications?: string[] | null
          specialization?: string | null
          specializations?: string[] | null
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
          verification_document_url?: string | null
          verification_notes?: string | null
          verification_status?: string
          verification_submitted_at?: string | null
          work_experience?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_responses: {
        Row: {
          created_at: string
          id: string
          message: string
          provider_id: string
          requirement_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          provider_id: string
          requirement_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          provider_id?: string
          requirement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirement_responses_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      requirements: {
        Row: {
          budget_range: string | null
          created_at: string
          description: string
          duration_type: string | null
          id: string
          location: string | null
          patient_id: string
          provider_type: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          budget_range?: string | null
          created_at?: string
          description: string
          duration_type?: string | null
          id?: string
          location?: string | null
          patient_id: string
          provider_type?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          budget_range?: string | null
          created_at?: string
          description?: string
          duration_type?: string | null
          id?: string
          location?: string | null
          patient_id?: string
          provider_type?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          id: string
          patient_id: string
          provider_id: string
          rating: number
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          id?: string
          patient_id: string
          provider_id: string
          rating: number
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          patient_id?: string
          provider_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          name: string
          price: number
          provider_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name: string
          price?: number
          provider_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name?: string
          price?: number
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_owner: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "patient" | "provider" | "organization" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["patient", "provider", "organization", "member"],
    },
  },
} as const
