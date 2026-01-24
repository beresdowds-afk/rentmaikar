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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      contact_settings: {
        Row: {
          contact_type: string
          contact_value: string
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          region: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          contact_type: string
          contact_value: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          region: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          contact_type?: string
          contact_value?: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          region?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      device_activity_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          device_id: string
          id: string
          performed_by: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          device_id: string
          id?: string
          performed_by: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          device_id?: string
          id?: string
          performed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_activity_log_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "iot_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          region: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          region?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          region?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          answer: string
          category_id: string
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          question: string
          region: string | null
          updated_at: string
        }
        Insert: {
          answer: string
          category_id: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          question: string
          region?: string | null
          updated_at?: string
        }
        Update: {
          answer?: string
          category_id?: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          question?: string
          region?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faq_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "faq_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_conversations: {
        Row: {
          assigned_to: string | null
          channel: string
          created_at: string
          id: string
          last_message_at: string
          priority: string
          region: string
          status: string
          subject: string | null
          updated_at: string
          user_email: string | null
          user_id: string | null
          user_name: string | null
          user_phone: string | null
        }
        Insert: {
          assigned_to?: string | null
          channel: string
          created_at?: string
          id?: string
          last_message_at?: string
          priority?: string
          region: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Update: {
          assigned_to?: string | null
          channel?: string
          created_at?: string
          id?: string
          last_message_at?: string
          priority?: string
          region?: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Relationships: []
      }
      inbox_messages: {
        Row: {
          channel: string
          content: string
          conversation_id: string
          created_at: string
          external_id: string | null
          id: string
          is_read: boolean
          metadata: Json | null
          read_at: string | null
          sender_id: string | null
          sender_name: string | null
          sender_type: string
        }
        Insert: {
          channel: string
          content: string
          conversation_id: string
          created_at?: string
          external_id?: string | null
          id?: string
          is_read?: boolean
          metadata?: Json | null
          read_at?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sender_type: string
        }
        Update: {
          channel?: string
          content?: string
          conversation_id?: string
          created_at?: string
          external_id?: string | null
          id?: string
          is_read?: boolean
          metadata?: Json | null
          read_at?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "inbox_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      iot_device_orders: {
        Row: {
          created_at: string
          currency: string
          delivery_confirmed_at: string | null
          delivery_confirmed_by: string | null
          device_price: number
          id: string
          installation_confirmed_at: string | null
          installation_notes: string | null
          installed_sim_number: string | null
          installed_sim_provider: string | null
          notes: string | null
          owner_email: string | null
          owner_id: string
          owner_phone: string | null
          payment_confirmed_at: string | null
          payment_confirmed_by: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          shipped_at: string | null
          shipped_by: string | null
          shipping_address: string | null
          shipping_status: string
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          delivery_confirmed_at?: string | null
          delivery_confirmed_by?: string | null
          device_price: number
          id?: string
          installation_confirmed_at?: string | null
          installation_notes?: string | null
          installed_sim_number?: string | null
          installed_sim_provider?: string | null
          notes?: string | null
          owner_email?: string | null
          owner_id: string
          owner_phone?: string | null
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          shipped_at?: string | null
          shipped_by?: string | null
          shipping_address?: string | null
          shipping_status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          delivery_confirmed_at?: string | null
          delivery_confirmed_by?: string | null
          device_price?: number
          id?: string
          installation_confirmed_at?: string | null
          installation_notes?: string | null
          installed_sim_number?: string | null
          installed_sim_provider?: string | null
          notes?: string | null
          owner_email?: string | null
          owner_id?: string
          owner_phone?: string | null
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          shipped_at?: string | null
          shipped_by?: string | null
          shipping_address?: string | null
          shipping_status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      iot_device_pricing: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          id: string
          price: number
          region: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          currency: string
          description?: string | null
          id?: string
          price: number
          region: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          price?: number
          region?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      iot_devices: {
        Row: {
          activated_at: string | null
          battery_level: number | null
          created_at: string | null
          device_model: string | null
          firmware_version: string | null
          id: string
          imei: string | null
          is_linked: boolean | null
          last_ping: string | null
          latitude: number | null
          longitude: number | null
          notes: string | null
          serial_number: string
          signal_strength: number | null
          sim_number: string | null
          sim_provider: string | null
          status: Database["public"]["Enums"]["device_status"] | null
          updated_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          activated_at?: string | null
          battery_level?: number | null
          created_at?: string | null
          device_model?: string | null
          firmware_version?: string | null
          id?: string
          imei?: string | null
          is_linked?: boolean | null
          last_ping?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          serial_number: string
          signal_strength?: number | null
          sim_number?: string | null
          sim_provider?: string | null
          status?: Database["public"]["Enums"]["device_status"] | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          activated_at?: string | null
          battery_level?: number | null
          created_at?: string | null
          device_model?: string | null
          firmware_version?: string | null
          id?: string
          imei?: string | null
          is_linked?: boolean | null
          last_ping?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          serial_number?: string
          signal_strength?: number | null
          sim_number?: string | null
          sim_provider?: string | null
          status?: Database["public"]["Enums"]["device_status"] | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "iot_devices_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_agreements: {
        Row: {
          admin_witness_id: string | null
          admin_witness_signature: string | null
          admin_witnessed_at: string | null
          agreement_content: string
          agreement_type: string
          agreement_version: string
          created_at: string
          driver_id: string
          driver_signature: string | null
          driver_signed_at: string | null
          email_sent_at: string | null
          email_sent_to: Json | null
          id: string
          owner_id: string
          owner_signature: string | null
          owner_signed_at: string | null
          pdf_url: string | null
          status: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          admin_witness_id?: string | null
          admin_witness_signature?: string | null
          admin_witnessed_at?: string | null
          agreement_content: string
          agreement_type?: string
          agreement_version?: string
          created_at?: string
          driver_id: string
          driver_signature?: string | null
          driver_signed_at?: string | null
          email_sent_at?: string | null
          email_sent_to?: Json | null
          id?: string
          owner_id: string
          owner_signature?: string | null
          owner_signed_at?: string | null
          pdf_url?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          admin_witness_id?: string | null
          admin_witness_signature?: string | null
          admin_witnessed_at?: string | null
          agreement_content?: string
          agreement_type?: string
          agreement_version?: string
          created_at?: string
          driver_id?: string
          driver_signature?: string | null
          driver_signed_at?: string | null
          email_sent_at?: string | null
          email_sent_to?: Json | null
          id?: string
          owner_id?: string
          owner_signature?: string | null
          owner_signed_at?: string | null
          pdf_url?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: []
      }
      payment_defaults: {
        Row: {
          amount_due: number
          created_at: string
          currency: string
          deactivated_at: string | null
          deactivation_eligible: boolean
          driver_id: string
          hours_overdue: number
          id: string
          last_notification_at: string | null
          notifications_sent: number
          payment_frequency: string
          rental_id: string
          resolved_at: string | null
          status: string
          vehicle_id: string
        }
        Insert: {
          amount_due: number
          created_at?: string
          currency?: string
          deactivated_at?: string | null
          deactivation_eligible?: boolean
          driver_id: string
          hours_overdue?: number
          id?: string
          last_notification_at?: string | null
          notifications_sent?: number
          payment_frequency?: string
          rental_id: string
          resolved_at?: string | null
          status?: string
          vehicle_id: string
        }
        Update: {
          amount_due?: number
          created_at?: string
          currency?: string
          deactivated_at?: string | null
          deactivation_eligible?: boolean
          driver_id?: string
          hours_overdue?: number
          id?: string
          last_notification_at?: string | null
          notifications_sent?: number
          payment_frequency?: string
          rental_id?: string
          resolved_at?: string | null
          status?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      policy_acceptances: {
        Row: {
          accepted_at: string
          id: string
          ip_address: string | null
          policy_type: string
          policy_version_id: string
          region: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          ip_address?: string | null
          policy_type: string
          policy_version_id: string
          region?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          ip_address?: string | null
          policy_type?: string
          policy_version_id?: string
          region?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_acceptances_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_versions: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          effective_date: string
          id: string
          is_active: boolean | null
          policy_type: string
          region: string
          summary: string | null
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          effective_date: string
          id?: string
          is_active?: boolean | null
          policy_type: string
          region: string
          summary?: string | null
          title: string
          updated_at?: string
          version: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          is_active?: boolean | null
          policy_type?: string
          region?: string
          summary?: string | null
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      price_modification_requests: {
        Row: {
          admin_response: string | null
          created_at: string | null
          current_rate: number
          id: string
          negotiation_id: string
          processed_at: string | null
          processed_by: string | null
          reason: string
          requested_rate: number
          requester_id: string
          requester_type: string
          status: string | null
        }
        Insert: {
          admin_response?: string | null
          created_at?: string | null
          current_rate: number
          id?: string
          negotiation_id: string
          processed_at?: string | null
          processed_by?: string | null
          reason: string
          requested_rate: number
          requester_id: string
          requester_type: string
          status?: string | null
        }
        Update: {
          admin_response?: string | null
          created_at?: string | null
          current_rate?: number
          id?: string
          negotiation_id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string
          requested_rate?: number
          requester_id?: string
          requester_type?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_modification_requests_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "price_negotiations"
            referencedColumns: ["id"]
          },
        ]
      }
      price_negotiations: {
        Row: {
          admin_counter_offer: number | null
          admin_response: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          currency: string
          driver_id: string
          driver_message: string | null
          final_daily_rate: number | null
          id: string
          is_locked: boolean | null
          locked_at: string | null
          locked_by: string | null
          owner_id: string | null
          rejection_reason: string | null
          requested_daily_rate: number
          status: Database["public"]["Enums"]["negotiation_status"] | null
          updated_at: string | null
          vehicle_category: string | null
          vehicle_id: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_year: number | null
        }
        Insert: {
          admin_counter_offer?: number | null
          admin_response?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          currency?: string
          driver_id: string
          driver_message?: string | null
          final_daily_rate?: number | null
          id?: string
          is_locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          owner_id?: string | null
          rejection_reason?: string | null
          requested_daily_rate: number
          status?: Database["public"]["Enums"]["negotiation_status"] | null
          updated_at?: string | null
          vehicle_category?: string | null
          vehicle_id?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
        }
        Update: {
          admin_counter_offer?: number | null
          admin_response?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          currency?: string
          driver_id?: string
          driver_message?: string | null
          final_daily_rate?: number | null
          id?: string
          is_locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          owner_id?: string | null
          rejection_reason?: string | null
          requested_daily_rate?: number
          status?: Database["public"]["Enums"]["negotiation_status"] | null
          updated_at?: string | null
          vehicle_category?: string | null
          vehicle_id?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "price_negotiations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          daily_plan_forbidden: boolean | null
          daily_plan_forbidden_at: string | null
          daily_plan_forbidden_reason: string | null
          email: string | null
          full_name: string | null
          id: string
          notification_email: boolean | null
          notification_sms: boolean | null
          notification_whatsapp: boolean | null
          phone: string | null
          phone_verification_code: string | null
          phone_verification_expires_at: string | null
          phone_verified: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          daily_plan_forbidden?: boolean | null
          daily_plan_forbidden_at?: string | null
          daily_plan_forbidden_reason?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          notification_email?: boolean | null
          notification_sms?: boolean | null
          notification_whatsapp?: boolean | null
          phone?: string | null
          phone_verification_code?: string | null
          phone_verification_expires_at?: string | null
          phone_verified?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          daily_plan_forbidden?: boolean | null
          daily_plan_forbidden_at?: string | null
          daily_plan_forbidden_reason?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          notification_email?: boolean | null
          notification_sms?: boolean | null
          notification_whatsapp?: boolean | null
          phone?: string | null
          phone_verification_code?: string | null
          phone_verification_expires_at?: string | null
          phone_verified?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rent_to_own_agreements: {
        Row: {
          admin_witness_id: string | null
          admin_witness_signature: string | null
          admin_witnessed_at: string | null
          agreement_content: string
          allow_buyout: boolean
          allow_conversion_to_rental: boolean
          created_at: string
          currency: string
          down_payment: number
          driver_id: string
          driver_signature: string | null
          driver_signed_at: string | null
          duration_months: number
          id: string
          listing_id: string
          monthly_payment: number
          next_payment_due: string | null
          owner_id: string
          owner_signature: string | null
          owner_signed_at: string | null
          payments_made: number
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          total_amount_paid: number
          total_price: number
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          admin_witness_id?: string | null
          admin_witness_signature?: string | null
          admin_witnessed_at?: string | null
          agreement_content: string
          allow_buyout?: boolean
          allow_conversion_to_rental?: boolean
          created_at?: string
          currency?: string
          down_payment: number
          driver_id: string
          driver_signature?: string | null
          driver_signed_at?: string | null
          duration_months: number
          id?: string
          listing_id: string
          monthly_payment: number
          next_payment_due?: string | null
          owner_id: string
          owner_signature?: string | null
          owner_signed_at?: string | null
          payments_made?: number
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          total_amount_paid?: number
          total_price: number
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          admin_witness_id?: string | null
          admin_witness_signature?: string | null
          admin_witnessed_at?: string | null
          agreement_content?: string
          allow_buyout?: boolean
          allow_conversion_to_rental?: boolean
          created_at?: string
          currency?: string
          down_payment?: number
          driver_id?: string
          driver_signature?: string | null
          driver_signed_at?: string | null
          duration_months?: number
          id?: string
          listing_id?: string
          monthly_payment?: number
          next_payment_due?: string | null
          owner_id?: string
          owner_signature?: string | null
          owner_signed_at?: string | null
          payments_made?: number
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          total_amount_paid?: number
          total_price?: number
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_to_own_agreements_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "rent_to_own_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_to_own_agreements_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_to_own_listings: {
        Row: {
          admin_counter_down_payment: number | null
          admin_counter_duration_months: number | null
          admin_counter_monthly_payment: number | null
          admin_counter_total_price: number | null
          admin_response: string | null
          allow_buyout: boolean
          allow_conversion_to_rental: boolean
          approved_at: string | null
          approved_by: string | null
          created_at: string
          currency: string
          down_payment: number
          duration_months: number
          final_down_payment: number | null
          final_duration_months: number | null
          final_monthly_payment: number | null
          final_total_price: number | null
          id: string
          is_available: boolean
          monthly_payment: number
          owner_id: string
          owner_message: string | null
          status: string
          total_price: number
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          admin_counter_down_payment?: number | null
          admin_counter_duration_months?: number | null
          admin_counter_monthly_payment?: number | null
          admin_counter_total_price?: number | null
          admin_response?: string | null
          allow_buyout?: boolean
          allow_conversion_to_rental?: boolean
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency?: string
          down_payment?: number
          duration_months: number
          final_down_payment?: number | null
          final_duration_months?: number | null
          final_monthly_payment?: number | null
          final_total_price?: number | null
          id?: string
          is_available?: boolean
          monthly_payment: number
          owner_id: string
          owner_message?: string | null
          status?: string
          total_price: number
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          admin_counter_down_payment?: number | null
          admin_counter_duration_months?: number | null
          admin_counter_monthly_payment?: number | null
          admin_counter_total_price?: number | null
          admin_response?: string | null
          allow_buyout?: boolean
          allow_conversion_to_rental?: boolean
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency?: string
          down_payment?: number
          duration_months?: number
          final_down_payment?: number | null
          final_duration_months?: number | null
          final_monthly_payment?: number | null
          final_total_price?: number | null
          id?: string
          is_available?: boolean
          monthly_payment?: number
          owner_id?: string
          owner_message?: string | null
          status?: string
          total_price?: number
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_to_own_listings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_to_own_settings: {
        Row: {
          feature_enabled: boolean
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          feature_enabled?: boolean
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          feature_enabled?: boolean
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      support_staff: {
        Row: {
          assigned_city: string
          assigned_region: string
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          support_type: Database["public"]["Enums"]["support_task_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_city: string
          assigned_region?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          support_type: Database["public"]["Enums"]["support_task_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_city?: string
          assigned_region?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          support_type?: Database["public"]["Enums"]["support_task_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_task_updates: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string
          id: string
          new_status: string | null
          previous_status: string | null
          task_id: string
          update_type: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string
          id?: string
          new_status?: string | null
          previous_status?: string | null
          task_id: string
          update_type: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string
          id?: string
          new_status?: string | null
          previous_status?: string | null
          task_id?: string
          update_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_task_updates_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "support_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tasks: {
        Row: {
          agreement_id: string | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          city: string
          created_at: string
          description: string | null
          device_id: string | null
          driver_id: string | null
          estimated_duration_hours: number | null
          id: string
          iot_status: Database["public"]["Enums"]["iot_task_status"] | null
          legal_status: Database["public"]["Enums"]["legal_task_status"] | null
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          owner_id: string | null
          priority: string
          recall_id: string | null
          region: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          task_type: Database["public"]["Enums"]["support_task_type"]
          title: string
          updated_at: string
          vehicle_id: string | null
          vehicle_status:
            | Database["public"]["Enums"]["vehicle_task_status"]
            | null
        }
        Insert: {
          agreement_id?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          city: string
          created_at?: string
          description?: string | null
          device_id?: string | null
          driver_id?: string | null
          estimated_duration_hours?: number | null
          id?: string
          iot_status?: Database["public"]["Enums"]["iot_task_status"] | null
          legal_status?: Database["public"]["Enums"]["legal_task_status"] | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          owner_id?: string | null
          priority?: string
          recall_id?: string | null
          region?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          task_type: Database["public"]["Enums"]["support_task_type"]
          title: string
          updated_at?: string
          vehicle_id?: string | null
          vehicle_status?:
            | Database["public"]["Enums"]["vehicle_task_status"]
            | null
        }
        Update: {
          agreement_id?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          city?: string
          created_at?: string
          description?: string | null
          device_id?: string | null
          driver_id?: string | null
          estimated_duration_hours?: number | null
          id?: string
          iot_status?: Database["public"]["Enums"]["iot_task_status"] | null
          legal_status?: Database["public"]["Enums"]["legal_task_status"] | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          owner_id?: string | null
          priority?: string
          recall_id?: string | null
          region?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          task_type?: Database["public"]["Enums"]["support_task_type"]
          title?: string
          updated_at?: string
          vehicle_id?: string | null
          vehicle_status?:
            | Database["public"]["Enums"]["vehicle_task_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tasks_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "legal_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "support_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tasks_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "iot_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tasks_recall_id_fkey"
            columns: ["recall_id"]
            isOneToOne: false
            referencedRelation: "vehicle_recalls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tasks_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
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
      vehicle_category_prices: {
        Row: {
          category: string
          created_at: string
          currency: string
          id: string
          price: number
          region: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          currency?: string
          id?: string
          price: number
          region: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          currency?: string
          id?: string
          price?: number
          region?: string
          updated_at?: string
        }
        Relationships: []
      }
      vehicle_incidents: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          actual_downtime_hours: number | null
          created_at: string
          description: string
          driver_id: string
          estimated_downtime_hours: number | null
          id: string
          incident_type: Database["public"]["Enums"]["incident_type"]
          iot_data: Json | null
          iot_deceleration_g: number | null
          iot_impact_severity: string | null
          iot_speed_at_impact: number | null
          iot_trigger_type: string | null
          iot_triggered_at: string | null
          is_iot_detected: boolean
          is_late_report: boolean
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          occurred_at: string
          owner_id: string | null
          photos: string[] | null
          reported_at: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["incident_severity"]
          status: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actual_downtime_hours?: number | null
          created_at?: string
          description: string
          driver_id: string
          estimated_downtime_hours?: number | null
          id?: string
          incident_type: Database["public"]["Enums"]["incident_type"]
          iot_data?: Json | null
          iot_deceleration_g?: number | null
          iot_impact_severity?: string | null
          iot_speed_at_impact?: number | null
          iot_trigger_type?: string | null
          iot_triggered_at?: string | null
          is_iot_detected?: boolean
          is_late_report?: boolean
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          occurred_at: string
          owner_id?: string | null
          photos?: string[] | null
          reported_at?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actual_downtime_hours?: number | null
          created_at?: string
          description?: string
          driver_id?: string
          estimated_downtime_hours?: number | null
          id?: string
          incident_type?: Database["public"]["Enums"]["incident_type"]
          iot_data?: Json | null
          iot_deceleration_g?: number | null
          iot_impact_severity?: string | null
          iot_speed_at_impact?: number | null
          iot_trigger_type?: string | null
          iot_triggered_at?: string | null
          is_iot_detected?: boolean
          is_late_report?: boolean
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          occurred_at?: string
          owner_id?: string | null
          photos?: string[] | null
          reported_at?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          title?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      vehicle_recalls: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          driver_id: string | null
          driver_notified_at: string | null
          failed_capture_attempts: number | null
          id: string
          iot_failure_type: string | null
          last_known_location_address: string | null
          last_known_location_lat: number | null
          last_known_location_lng: number | null
          last_successful_ping: string | null
          last_telemetry_snapshot: Json | null
          owner_id: string | null
          owner_notified_at: string | null
          priority: string
          recall_reason: string
          recall_type: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          driver_id?: string | null
          driver_notified_at?: string | null
          failed_capture_attempts?: number | null
          id?: string
          iot_failure_type?: string | null
          last_known_location_address?: string | null
          last_known_location_lat?: number | null
          last_known_location_lng?: number | null
          last_successful_ping?: string | null
          last_telemetry_snapshot?: Json | null
          owner_id?: string | null
          owner_notified_at?: string | null
          priority?: string
          recall_reason: string
          recall_type?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          driver_id?: string | null
          driver_notified_at?: string | null
          failed_capture_attempts?: number | null
          id?: string
          iot_failure_type?: string | null
          last_known_location_address?: string | null
          last_known_location_lat?: number | null
          last_known_location_lng?: number | null
          last_successful_ping?: string | null
          last_telemetry_snapshot?: Json | null
          owner_id?: string | null
          owner_notified_at?: string | null
          priority?: string
          recall_reason?: string
          recall_type?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_recalls_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          license_plate: string
          make: string
          model: string
          owner_id: string
          status: string | null
          updated_at: string | null
          vin: string | null
          year: number
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          license_plate: string
          make: string
          model: string
          owner_id: string
          status?: string | null
          updated_at?: string | null
          vin?: string | null
          year: number
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          license_plate?: string
          make?: string
          model?: string
          owner_id?: string
          status?: string | null
          updated_at?: string | null
          vin?: string | null
          year?: number
        }
        Relationships: []
      }
      voip_call_groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          region: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          region: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          region?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voip_call_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      voip_call_participants: {
        Row: {
          call_id: string
          created_at: string
          display_name: string | null
          id: string
          joined_at: string | null
          left_at: string | null
          participant_type: string
          phone_number: string
          region: string
          status: string
          user_id: string | null
        }
        Insert: {
          call_id: string
          created_at?: string
          display_name?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          participant_type: string
          phone_number: string
          region: string
          status?: string
          user_id?: string | null
        }
        Update: {
          call_id?: string
          created_at?: string
          display_name?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          participant_type?: string
          phone_number?: string
          region?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voip_call_participants_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "voip_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voip_call_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      voip_calls: {
        Row: {
          call_sid: string | null
          call_type: string
          created_at: string
          direction: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          initiated_by: string | null
          recording_duration_seconds: number | null
          recording_size_bytes: number | null
          recording_status: string | null
          recording_stored_at: string | null
          recording_url: string | null
          region: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          call_sid?: string | null
          call_type: string
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          initiated_by?: string | null
          recording_duration_seconds?: number | null
          recording_size_bytes?: number | null
          recording_status?: string | null
          recording_stored_at?: string | null
          recording_url?: string | null
          region: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          call_sid?: string | null
          call_type?: string
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          initiated_by?: string | null
          recording_duration_seconds?: number | null
          recording_size_bytes?: number | null
          recording_status?: string | null
          recording_stored_at?: string | null
          recording_url?: string | null
          region?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voip_calls_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      voip_group_members: {
        Row: {
          added_at: string
          display_name: string | null
          group_id: string
          id: string
          is_active: boolean
          phone_number: string
          region: string
          user_id: string | null
        }
        Insert: {
          added_at?: string
          display_name?: string | null
          group_id: string
          id?: string
          is_active?: boolean
          phone_number: string
          region: string
          user_id?: string | null
        }
        Update: {
          added_at?: string
          display_name?: string | null
          group_id?: string
          id?: string
          is_active?: boolean
          phone_number?: string
          region?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voip_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "voip_call_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voip_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      weekly_inspection_reports: {
        Row: {
          admin_decision: string | null
          admin_id: string | null
          admin_notes: string | null
          admin_reviewed_at: string | null
          created_at: string | null
          driver_accepted_withdrawal: boolean | null
          driver_id: string
          driver_responded_at: string | null
          id: string
          owner_action: string | null
          owner_id: string | null
          owner_notes: string | null
          owner_reviewed_at: string | null
          photo_back_left_tyre: string | null
          photo_back_right_tyre: string | null
          photo_back_view: string | null
          photo_dashboard: string | null
          photo_driver_side: string | null
          photo_front_left_tyre: string | null
          photo_front_right_tyre: string | null
          photo_front_view: string | null
          photo_interior: string | null
          photo_passenger_side: string | null
          photo_timestamps: Json | null
          status: string | null
          submitted_at: string | null
          updated_at: string | null
          vehicle_id: string
          week_start_date: string
        }
        Insert: {
          admin_decision?: string | null
          admin_id?: string | null
          admin_notes?: string | null
          admin_reviewed_at?: string | null
          created_at?: string | null
          driver_accepted_withdrawal?: boolean | null
          driver_id: string
          driver_responded_at?: string | null
          id?: string
          owner_action?: string | null
          owner_id?: string | null
          owner_notes?: string | null
          owner_reviewed_at?: string | null
          photo_back_left_tyre?: string | null
          photo_back_right_tyre?: string | null
          photo_back_view?: string | null
          photo_dashboard?: string | null
          photo_driver_side?: string | null
          photo_front_left_tyre?: string | null
          photo_front_right_tyre?: string | null
          photo_front_view?: string | null
          photo_interior?: string | null
          photo_passenger_side?: string | null
          photo_timestamps?: Json | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          vehicle_id: string
          week_start_date: string
        }
        Update: {
          admin_decision?: string | null
          admin_id?: string | null
          admin_notes?: string | null
          admin_reviewed_at?: string | null
          created_at?: string | null
          driver_accepted_withdrawal?: boolean | null
          driver_id?: string
          driver_responded_at?: string | null
          id?: string
          owner_action?: string | null
          owner_id?: string | null
          owner_notes?: string | null
          owner_reviewed_at?: string | null
          photo_back_left_tyre?: string | null
          photo_back_right_tyre?: string | null
          photo_back_view?: string | null
          photo_dashboard?: string | null
          photo_driver_side?: string | null
          photo_front_left_tyre?: string | null
          photo_front_right_tyre?: string | null
          photo_front_view?: string | null
          photo_interior?: string | null
          photo_passenger_side?: string | null
          photo_timestamps?: Json | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          vehicle_id?: string
          week_start_date?: string
        }
        Relationships: []
      }
      weekly_report_settings: {
        Row: {
          feature_enabled: boolean | null
          grace_period_hours: number | null
          id: string
          report_due_day: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          feature_enabled?: boolean | null
          grace_period_hours?: number | null
          id?: string
          report_due_day?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          feature_enabled?: boolean | null
          grace_period_hours?: number | null
          id?: string
          report_due_day?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_support_staff_city: {
        Args: {
          _type: Database["public"]["Enums"]["support_task_type"]
          _user_id: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_any_support_staff: { Args: { _user_id: string }; Returns: boolean }
      is_support_staff: {
        Args: {
          _type: Database["public"]["Enums"]["support_task_type"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "owner"
        | "driver"
        | "legal_support"
        | "iot_support"
        | "vehicle_support"
      device_status: "inactive" | "active" | "offline" | "maintenance"
      incident_severity: "low" | "medium" | "high" | "critical"
      incident_status:
        | "reported"
        | "acknowledged"
        | "in_progress"
        | "resolved"
        | "closed"
      incident_type:
        | "accident"
        | "maintenance"
        | "breakdown"
        | "theft"
        | "other"
      iot_task_status:
        | "assigned"
        | "scheduled"
        | "in_transit"
        | "on_site"
        | "installation_complete"
        | "testing"
        | "completed"
        | "failed"
      legal_task_status:
        | "open"
        | "document_review"
        | "pending_signature"
        | "escalated"
        | "resolved"
        | "closed"
      negotiation_status:
        | "pending"
        | "counter_offer"
        | "approved"
        | "rejected"
        | "locked"
      support_task_type:
        | "legal"
        | "iot_installation"
        | "iot_maintenance"
        | "vehicle_recall"
        | "vehicle_maintenance"
      vehicle_task_status:
        | "reported"
        | "dispatched"
        | "inspection"
        | "repair_in_progress"
        | "pending_parts"
        | "quality_check"
        | "completed"
        | "escalated"
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
      app_role: [
        "admin",
        "owner",
        "driver",
        "legal_support",
        "iot_support",
        "vehicle_support",
      ],
      device_status: ["inactive", "active", "offline", "maintenance"],
      incident_severity: ["low", "medium", "high", "critical"],
      incident_status: [
        "reported",
        "acknowledged",
        "in_progress",
        "resolved",
        "closed",
      ],
      incident_type: ["accident", "maintenance", "breakdown", "theft", "other"],
      iot_task_status: [
        "assigned",
        "scheduled",
        "in_transit",
        "on_site",
        "installation_complete",
        "testing",
        "completed",
        "failed",
      ],
      legal_task_status: [
        "open",
        "document_review",
        "pending_signature",
        "escalated",
        "resolved",
        "closed",
      ],
      negotiation_status: [
        "pending",
        "counter_offer",
        "approved",
        "rejected",
        "locked",
      ],
      support_task_type: [
        "legal",
        "iot_installation",
        "iot_maintenance",
        "vehicle_recall",
        "vehicle_maintenance",
      ],
      vehicle_task_status: [
        "reported",
        "dispatched",
        "inspection",
        "repair_in_progress",
        "pending_parts",
        "quality_check",
        "completed",
        "escalated",
      ],
    },
  },
} as const
