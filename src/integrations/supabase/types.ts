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
      account_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          link_type: string
          notes: string | null
          updated_at: string
          user_a_id: string
          user_b_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          link_type?: string
          notes?: string | null
          updated_at?: string
          user_a_id: string
          user_b_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          link_type?: string
          notes?: string | null
          updated_at?: string
          user_a_id?: string
          user_b_id?: string
        }
        Relationships: []
      }
      admin_assistant_permissions: {
        Row: {
          can_manage_content: boolean
          can_manage_iot: boolean
          can_manage_payments: boolean
          can_manage_rentals: boolean
          can_manage_support_tasks: boolean
          can_manage_users: boolean
          can_manage_vehicles: boolean
          can_send_communications: boolean
          can_view_audit_log: boolean
          can_view_communications: boolean
          can_view_iot: boolean
          can_view_payments: boolean
          can_view_rentals: boolean
          can_view_reports: boolean
          can_view_support_tasks: boolean
          can_view_users: boolean
          can_view_vehicles: boolean
          created_at: string
          granted_by: string | null
          id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          can_manage_content?: boolean
          can_manage_iot?: boolean
          can_manage_payments?: boolean
          can_manage_rentals?: boolean
          can_manage_support_tasks?: boolean
          can_manage_users?: boolean
          can_manage_vehicles?: boolean
          can_send_communications?: boolean
          can_view_audit_log?: boolean
          can_view_communications?: boolean
          can_view_iot?: boolean
          can_view_payments?: boolean
          can_view_rentals?: boolean
          can_view_reports?: boolean
          can_view_support_tasks?: boolean
          can_view_users?: boolean
          can_view_vehicles?: boolean
          created_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          can_manage_content?: boolean
          can_manage_iot?: boolean
          can_manage_payments?: boolean
          can_manage_rentals?: boolean
          can_manage_support_tasks?: boolean
          can_manage_users?: boolean
          can_manage_vehicles?: boolean
          can_send_communications?: boolean
          can_view_audit_log?: boolean
          can_view_communications?: boolean
          can_view_iot?: boolean
          can_view_payments?: boolean
          can_view_rentals?: boolean
          can_view_reports?: boolean
          can_view_support_tasks?: boolean
          can_view_users?: boolean
          can_view_vehicles?: boolean
          created_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_assistant_user_assignments: {
        Row: {
          assigned_by: string | null
          assistant_id: string
          created_at: string
          id: string
          notes: string | null
          target_user_id: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assistant_id: string
          created_at?: string
          id?: string
          notes?: string | null
          target_user_id: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assistant_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          target_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_table: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_daily_tasks: {
        Row: {
          category: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          id: string
          is_completed: boolean
          priority: string
          source_id: string | null
          source_table: string | null
          task_date: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          priority?: string
          source_id?: string | null
          source_table?: string | null
          task_date?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          priority?: string
          source_id?: string | null
          source_table?: string | null
          task_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          is_active: boolean
          last_activity: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_activity?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_activity?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agreement_renewal_alerts: {
        Row: {
          agreement_id: string
          alert_type: string
          created_at: string
          id: string
          sent_at: string
          sent_to: Json | null
        }
        Insert: {
          agreement_id: string
          alert_type: string
          created_at?: string
          id?: string
          sent_at?: string
          sent_to?: Json | null
        }
        Update: {
          agreement_id?: string
          alert_type?: string
          created_at?: string
          id?: string
          sent_at?: string
          sent_to?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agreement_renewal_alerts_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "legal_agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      api_key_usage_log: {
        Row: {
          api_key_id: string
          created_at: string
          endpoint: string
          id: string
          ip_address: string | null
          method: string
          response_time_ms: number | null
          status_code: number | null
          user_agent: string | null
        }
        Insert: {
          api_key_id: string
          created_at?: string
          endpoint: string
          id?: string
          ip_address?: string | null
          method: string
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: string | null
          method?: string
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_key_usage_log_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          allowed_origins: string[] | null
          created_at: string
          created_by: string
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: Json
          rate_limit_per_hour: number | null
          usage_count: number
        }
        Insert: {
          allowed_origins?: string[] | null
          created_at?: string
          created_by: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          permissions?: Json
          rate_limit_per_hour?: number | null
          usage_count?: number
        }
        Update: {
          allowed_origins?: string[] | null
          created_at?: string
          created_by?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: Json
          rate_limit_per_hour?: number | null
          usage_count?: number
        }
        Relationships: []
      }
      api_validation_endpoints: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          method: string
          name: string
          path: string
          rate_limit_per_minute: number | null
          request_schema: Json | null
          required_permissions: string[] | null
          requires_auth: boolean
          response_schema: Json | null
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          method?: string
          name: string
          path: string
          rate_limit_per_minute?: number | null
          request_schema?: Json | null
          required_permissions?: string[] | null
          requires_auth?: boolean
          response_schema?: Json | null
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          method?: string
          name?: string
          path?: string
          rate_limit_per_minute?: number | null
          request_schema?: Json | null
          required_permissions?: string[] | null
          requires_auth?: boolean
          response_schema?: Json | null
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      application_pipeline_events: {
        Row: {
          actor_id: string | null
          application_id: string
          created_at: string
          details: Json
          event_type: string
          id: string
          message: string | null
          status: string
        }
        Insert: {
          actor_id?: string | null
          application_id: string
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          message?: string | null
          status: string
        }
        Update: {
          actor_id?: string | null
          application_id?: string
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          message?: string | null
          status?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          agreed_fees: boolean | null
          agreed_iot: boolean
          agreed_privacy: boolean
          agreed_terms: boolean
          application_type: Database["public"]["Enums"]["application_type"]
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          city: string
          country: string
          created_at: string
          desired_weekly_price: number | null
          email: string
          first_name: string
          has_driver_license: boolean | null
          has_insurance: boolean | null
          has_registration: boolean | null
          id: string
          last_name: string
          phone_country: string
          phone_number: string
          referee1_address: string | null
          referee1_name: string | null
          referee1_phone: string | null
          referee2_address: string | null
          referee2_name: string | null
          referee2_phone: string | null
          referee3_address: string | null
          referee3_name: string | null
          referee3_phone: string | null
          referees_verification_status: string
          region: string
          rejection_reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rideshare_platforms: string[] | null
          security_deposit_acknowledged: boolean | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
          user_id: string | null
          vehicle_color: string | null
          vehicle_description: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_plate: string | null
          vehicle_year: number | null
          zip_code: string
        }
        Insert: {
          agreed_fees?: boolean | null
          agreed_iot?: boolean
          agreed_privacy?: boolean
          agreed_terms?: boolean
          application_type: Database["public"]["Enums"]["application_type"]
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          city: string
          country: string
          created_at?: string
          desired_weekly_price?: number | null
          email: string
          first_name: string
          has_driver_license?: boolean | null
          has_insurance?: boolean | null
          has_registration?: boolean | null
          id?: string
          last_name: string
          phone_country: string
          phone_number: string
          referee1_address?: string | null
          referee1_name?: string | null
          referee1_phone?: string | null
          referee2_address?: string | null
          referee2_name?: string | null
          referee2_phone?: string | null
          referee3_address?: string | null
          referee3_name?: string | null
          referee3_phone?: string | null
          referees_verification_status?: string
          region?: string
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rideshare_platforms?: string[] | null
          security_deposit_acknowledged?: boolean | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id?: string | null
          vehicle_color?: string | null
          vehicle_description?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          vehicle_year?: number | null
          zip_code: string
        }
        Update: {
          agreed_fees?: boolean | null
          agreed_iot?: boolean
          agreed_privacy?: boolean
          agreed_terms?: boolean
          application_type?: Database["public"]["Enums"]["application_type"]
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          city?: string
          country?: string
          created_at?: string
          desired_weekly_price?: number | null
          email?: string
          first_name?: string
          has_driver_license?: boolean | null
          has_insurance?: boolean | null
          has_registration?: boolean | null
          id?: string
          last_name?: string
          phone_country?: string
          phone_number?: string
          referee1_address?: string | null
          referee1_name?: string | null
          referee1_phone?: string | null
          referee2_address?: string | null
          referee2_name?: string | null
          referee2_phone?: string | null
          referee3_address?: string | null
          referee3_name?: string | null
          referee3_phone?: string | null
          referees_verification_status?: string
          region?: string
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rideshare_platforms?: string[] | null
          security_deposit_acknowledged?: boolean | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id?: string | null
          vehicle_color?: string | null
          vehicle_description?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          vehicle_year?: number | null
          zip_code?: string
        }
        Relationships: []
      }
      communication_providers: {
        Row: {
          country_code_prefix: string
          created_at: string
          forwarding_number: string | null
          id: string
          is_active: boolean
          region_code: string
          region_name: string
          retry_count: number
          sender_id: string | null
          sms_provider: string
          updated_at: string
          updated_by: string | null
          voice_provider: string
          whatsapp_provider: string | null
        }
        Insert: {
          country_code_prefix: string
          created_at?: string
          forwarding_number?: string | null
          id?: string
          is_active?: boolean
          region_code: string
          region_name: string
          retry_count?: number
          sender_id?: string | null
          sms_provider?: string
          updated_at?: string
          updated_by?: string | null
          voice_provider?: string
          whatsapp_provider?: string | null
        }
        Update: {
          country_code_prefix?: string
          created_at?: string
          forwarding_number?: string | null
          id?: string
          is_active?: boolean
          region_code?: string
          region_name?: string
          retry_count?: number
          sender_id?: string | null
          sms_provider?: string
          updated_at?: string
          updated_by?: string | null
          voice_provider?: string
          whatsapp_provider?: string | null
        }
        Relationships: []
      }
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
      document_export_audit: {
        Row: {
          created_at: string
          document_count: number
          document_ids: string[]
          error: string | null
          exporter_id: string
          id: string
          metadata: Json
          region: string | null
          source: string
          status: string
          storage_path: string | null
          target_user_id: string
          vehicle_id: string | null
          zip_size_bytes: number | null
        }
        Insert: {
          created_at?: string
          document_count?: number
          document_ids?: string[]
          error?: string | null
          exporter_id: string
          id?: string
          metadata?: Json
          region?: string | null
          source?: string
          status?: string
          storage_path?: string | null
          target_user_id: string
          vehicle_id?: string | null
          zip_size_bytes?: number | null
        }
        Update: {
          created_at?: string
          document_count?: number
          document_ids?: string[]
          error?: string | null
          exporter_id?: string
          id?: string
          metadata?: Json
          region?: string | null
          source?: string
          status?: string
          storage_path?: string | null
          target_user_id?: string
          vehicle_id?: string | null
          zip_size_bytes?: number | null
        }
        Relationships: []
      }
      driver_behavior_logs: {
        Row: {
          accel_x: number | null
          accel_y: number | null
          accel_z: number | null
          created_at: string
          driver_id: string | null
          event_type: string
          heading: number | null
          id: string
          latitude: number | null
          longitude: number | null
          mqtt_topic: string | null
          raw_payload: Json | null
          rental_id: string | null
          severity: string
          speed_at_event: number | null
          threshold_g: number | null
          total_g: number | null
          vehicle_id: string
        }
        Insert: {
          accel_x?: number | null
          accel_y?: number | null
          accel_z?: number | null
          created_at?: string
          driver_id?: string | null
          event_type: string
          heading?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          mqtt_topic?: string | null
          raw_payload?: Json | null
          rental_id?: string | null
          severity?: string
          speed_at_event?: number | null
          threshold_g?: number | null
          total_g?: number | null
          vehicle_id: string
        }
        Update: {
          accel_x?: number | null
          accel_y?: number | null
          accel_z?: number | null
          created_at?: string
          driver_id?: string | null
          event_type?: string
          heading?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          mqtt_topic?: string | null
          raw_payload?: Json | null
          rental_id?: string | null
          severity?: string
          speed_at_event?: number | null
          threshold_g?: number | null
          total_g?: number | null
          vehicle_id?: string
        }
        Relationships: []
      }
      driver_call_ins: {
        Row: {
          created_at: string
          driver_id: string
          end_reason: string | null
          ended_at: string | null
          expires_at: string
          extend_requested: boolean
          geofence_lat: number | null
          geofence_lng: number | null
          geofence_radius_m: number
          id: string
          notes: string | null
          reason: string
          rental_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["call_in_status"]
          telemetry_snapshot: Json | null
          type: Database["public"]["Enums"]["call_in_type"]
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          end_reason?: string | null
          ended_at?: string | null
          expires_at: string
          extend_requested?: boolean
          geofence_lat?: number | null
          geofence_lng?: number | null
          geofence_radius_m?: number
          id?: string
          notes?: string | null
          reason: string
          rental_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["call_in_status"]
          telemetry_snapshot?: Json | null
          type: Database["public"]["Enums"]["call_in_type"]
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          end_reason?: string | null
          ended_at?: string | null
          expires_at?: string
          extend_requested?: boolean
          geofence_lat?: number | null
          geofence_lng?: number | null
          geofence_radius_m?: number
          id?: string
          notes?: string | null
          reason?: string
          rental_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["call_in_status"]
          telemetry_snapshot?: Json | null
          type?: Database["public"]["Enums"]["call_in_type"]
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      email_analytics: {
        Row: {
          category: string
          count: number
          created_at: string
          date: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          category: string
          count?: number
          created_at?: string
          date?: string
          id?: string
          status: string
          updated_at?: string
        }
        Update: {
          category?: string
          count?: number
          created_at?: string
          date?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_bounces: {
        Row: {
          bounce_type: string
          bounced_at: string
          created_at: string
          details: string | null
          id: string
          message_id: string
          recipient: string
        }
        Insert: {
          bounce_type: string
          bounced_at?: string
          created_at?: string
          details?: string | null
          id?: string
          message_id: string
          recipient: string
        }
        Update: {
          bounce_type?: string
          bounced_at?: string
          created_at?: string
          details?: string | null
          id?: string
          message_id?: string
          recipient?: string
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          category: string | null
          click_count: number | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          open_count: number | null
          scheduled_date: string | null
          sent_count: number | null
          status: string | null
          target_audience: Json | null
          template: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          click_count?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          open_count?: number | null
          scheduled_date?: string | null
          sent_count?: number | null
          status?: string | null
          target_audience?: Json | null
          template?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          click_count?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          open_count?: number | null
          scheduled_date?: string | null
          sent_count?: number | null
          status?: string | null
          target_audience?: Json | null
          template?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_clicks: {
        Row: {
          clicked_at: string
          created_at: string
          id: string
          is_conversion: boolean
          link: string
          message_id: string
          recipient: string
        }
        Insert: {
          clicked_at?: string
          created_at?: string
          id?: string
          is_conversion?: boolean
          link: string
          message_id: string
          recipient: string
        }
        Update: {
          clicked_at?: string
          created_at?: string
          id?: string
          is_conversion?: boolean
          link?: string
          message_id?: string
          recipient?: string
        }
        Relationships: []
      }
      email_complaints: {
        Row: {
          complained_at: string
          complaint_type: string | null
          created_at: string
          id: string
          message_id: string
          recipient: string
        }
        Insert: {
          complained_at?: string
          complaint_type?: string | null
          created_at?: string
          id?: string
          message_id: string
          recipient: string
        }
        Update: {
          complained_at?: string
          complaint_type?: string | null
          created_at?: string
          id?: string
          message_id?: string
          recipient?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          category: string
          country: string | null
          created_at: string
          delivered_at: string | null
          error: string | null
          failed_at: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          priority: string
          recipient: string
          retry_count: number
          scheduled_for: string | null
          sent_at: string | null
          status: string
          template: string
          updated_at: string
        }
        Insert: {
          category: string
          country?: string | null
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          failed_at?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          priority?: string
          recipient: string
          retry_count?: number
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          template: string
          updated_at?: string
        }
        Update: {
          category?: string
          country?: string | null
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          failed_at?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          priority?: string
          recipient?: string
          retry_count?: number
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          template?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_opens: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          message_id: string
          opened_at: string
          recipient: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          message_id: string
          opened_at?: string
          recipient: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          message_id?: string
          opened_at?: string
          recipient?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      email_suppression_list: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          reason: string
          source_message_id: string | null
          suppressed_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          reason: string
          source_message_id?: string | null
          suppressed_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          reason?: string
          source_message_id?: string | null
          suppressed_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          category: string | null
          created_at: string
          html_content: string | null
          id: string
          is_active: boolean | null
          name: string
          subject: string
          text_content: string | null
          updated_at: string
          variables: Json | null
          version: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          html_content?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          text_content?: string | null
          updated_at?: string
          variables?: Json | null
          version?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          html_content?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          text_content?: string | null
          updated_at?: string
          variables?: Json | null
          version?: number | null
        }
        Relationships: []
      }
      expiry_notifications: {
        Row: {
          created_at: string
          days_until_expiry: number
          document_id: string | null
          id: string
          notification_channel: string
          notification_type: string
          recipient_id: string
          recipient_type: string
          sent_at: string
          vehicle_id: string | null
          voip_call_id: string | null
        }
        Insert: {
          created_at?: string
          days_until_expiry: number
          document_id?: string | null
          id?: string
          notification_channel: string
          notification_type: string
          recipient_id: string
          recipient_type: string
          sent_at?: string
          vehicle_id?: string | null
          voip_call_id?: string | null
        }
        Update: {
          created_at?: string
          days_until_expiry?: number
          document_id?: string | null
          id?: string
          notification_channel?: string
          notification_type?: string
          recipient_id?: string
          recipient_type?: string
          sent_at?: string
          vehicle_id?: string | null
          voip_call_id?: string | null
        }
        Relationships: []
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
          provider: string
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
          provider?: string
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
          provider?: string
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
      iot_sim_cards: {
        Row: {
          activated_at: string | null
          created_at: string
          data_limit_mb: number | null
          data_usage_mb: number | null
          device_id: string | null
          iccid: string
          id: string
          imsi: string | null
          last_session_at: string | null
          metadata: Json | null
          msisdn: string | null
          plan_name: string | null
          provider: string
          provider_sim_id: string | null
          status: string
          suspended_at: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          data_limit_mb?: number | null
          data_usage_mb?: number | null
          device_id?: string | null
          iccid: string
          id?: string
          imsi?: string | null
          last_session_at?: string | null
          metadata?: Json | null
          msisdn?: string | null
          plan_name?: string | null
          provider?: string
          provider_sim_id?: string | null
          status?: string
          suspended_at?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          data_limit_mb?: number | null
          data_usage_mb?: number | null
          device_id?: string | null
          iccid?: string
          id?: string
          imsi?: string | null
          last_session_at?: string | null
          metadata?: Json | null
          msisdn?: string | null
          plan_name?: string | null
          provider?: string
          provider_sim_id?: string | null
          status?: string
          suspended_at?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: []
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
          expires_at: string | null
          id: string
          is_compulsory: boolean
          owner_id: string
          owner_signature: string | null
          owner_signed_at: string | null
          parent_agreement_id: string | null
          pdf_url: string | null
          renewal_count: number
          renewal_notified_at: string | null
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
          expires_at?: string | null
          id?: string
          is_compulsory?: boolean
          owner_id: string
          owner_signature?: string | null
          owner_signed_at?: string | null
          parent_agreement_id?: string | null
          pdf_url?: string | null
          renewal_count?: number
          renewal_notified_at?: string | null
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
          expires_at?: string | null
          id?: string
          is_compulsory?: boolean
          owner_id?: string
          owner_signature?: string | null
          owner_signed_at?: string | null
          parent_agreement_id?: string | null
          pdf_url?: string | null
          renewal_count?: number
          renewal_notified_at?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_agreements_parent_agreement_id_fkey"
            columns: ["parent_agreement_id"]
            isOneToOne: false
            referencedRelation: "legal_agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_events: {
        Row: {
          channel: string
          conversation_id: string | null
          created_at: string
          direction: string
          error_code: string | null
          error_message: string | null
          event_type: string
          id: string
          message_id: string | null
          metadata: Json | null
          provider: string
          provider_event_id: string | null
          provider_message_id: string | null
          raw_payload: Json | null
          recipient: string | null
          region: string | null
          sender: string | null
          template_name: string | null
          user_id: string | null
        }
        Insert: {
          channel: string
          conversation_id?: string | null
          created_at?: string
          direction?: string
          error_code?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          provider: string
          provider_event_id?: string | null
          provider_message_id?: string | null
          raw_payload?: Json | null
          recipient?: string | null
          region?: string | null
          sender?: string | null
          template_name?: string | null
          user_id?: string | null
        }
        Update: {
          channel?: string
          conversation_id?: string | null
          created_at?: string
          direction?: string
          error_code?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          provider?: string
          provider_event_id?: string | null
          provider_message_id?: string | null
          raw_payload?: Json | null
          recipient?: string | null
          region?: string | null
          sender?: string | null
          template_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messaging_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "inbox_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      mqtt_telemetry_logs: {
        Row: {
          data_type: string
          id: string
          mqtt_topic: string | null
          payload: Json
          received_at: string
          vehicle_id: string
        }
        Insert: {
          data_type: string
          id?: string
          mqtt_topic?: string | null
          payload: Json
          received_at?: string
          vehicle_id: string
        }
        Update: {
          data_type?: string
          id?: string
          mqtt_topic?: string | null
          payload?: Json
          received_at?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      opay_transactions: {
        Row: {
          amount: number
          cashier_url: string | null
          created_at: string
          currency: string
          driver_id: string | null
          failure_reason: string | null
          id: string
          order_no: string | null
          payment_id: string | null
          raw_payload: Json | null
          reference: string
          rental_id: string | null
          status: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          amount: number
          cashier_url?: string | null
          created_at?: string
          currency?: string
          driver_id?: string | null
          failure_reason?: string | null
          id?: string
          order_no?: string | null
          payment_id?: string | null
          raw_payload?: Json | null
          reference: string
          rental_id?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          amount?: number
          cashier_url?: string | null
          created_at?: string
          currency?: string
          driver_id?: string | null
          failure_reason?: string | null
          id?: string
          order_no?: string | null
          payment_id?: string | null
          raw_payload?: Json | null
          reference?: string
          rental_id?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opay_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opay_transactions_rental_id_fkey"
            columns: ["rental_id"]
            isOneToOne: false
            referencedRelation: "rentals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opay_transactions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_earnings: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          notification_sent: boolean
          owner_id: string
          payout_method: string | null
          payout_reference: string | null
          period_end: string
          period_start: string
          processed_at: string | null
          rental_id: string | null
          status: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          notification_sent?: boolean
          owner_id: string
          payout_method?: string | null
          payout_reference?: string | null
          period_end: string
          period_start: string
          processed_at?: string | null
          rental_id?: string | null
          status?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          notification_sent?: boolean
          owner_id?: string
          payout_method?: string | null
          payout_reference?: string | null
          period_end?: string
          period_start?: string
          processed_at?: string | null
          rental_id?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_earnings_rental_id_fkey"
            columns: ["rental_id"]
            isOneToOne: false
            referencedRelation: "rentals"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_payout_accounts: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_code: string | null
          bank_name: string | null
          country_code: string
          created_at: string
          currency: string
          id: string
          is_default: boolean
          is_verified: boolean
          owner_id: string
          paypal_email: string | null
          provider: string
          recipient_code: string | null
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_code?: string | null
          bank_name?: string | null
          country_code: string
          created_at?: string
          currency: string
          id?: string
          is_default?: boolean
          is_verified?: boolean
          owner_id: string
          paypal_email?: string | null
          provider: string
          recipient_code?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_code?: string | null
          bank_name?: string | null
          country_code?: string
          created_at?: string
          currency?: string
          id?: string
          is_default?: boolean
          is_verified?: boolean
          owner_id?: string
          paypal_email?: string | null
          provider?: string
          recipient_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      owner_payouts: {
        Row: {
          amount: number
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          initiated_by: string
          owner_id: string
          payout_account_id: string | null
          processed_at: string | null
          provider: string
          raw_payload: Json | null
          scheduled_for: string | null
          status: string
          transfer_code: string | null
          transfer_reference: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          failure_reason?: string | null
          id?: string
          initiated_by?: string
          owner_id: string
          payout_account_id?: string | null
          processed_at?: string | null
          provider: string
          raw_payload?: Json | null
          scheduled_for?: string | null
          status?: string
          transfer_code?: string | null
          transfer_reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          initiated_by?: string
          owner_id?: string
          payout_account_id?: string | null
          processed_at?: string | null
          provider?: string
          raw_payload?: Json | null
          scheduled_for?: string | null
          status?: string
          transfer_code?: string | null
          transfer_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_payouts_payout_account_id_fkey"
            columns: ["payout_account_id"]
            isOneToOne: false
            referencedRelation: "owner_payout_accounts"
            referencedColumns: ["id"]
          },
        ]
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
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          driver_id: string
          failure_reason: string | null
          id: string
          notification_sent: boolean
          owner_id: string
          payment_frequency: string
          payment_method: string | null
          processed_at: string | null
          rental_id: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          driver_id: string
          failure_reason?: string | null
          id?: string
          notification_sent?: boolean
          owner_id: string
          payment_frequency?: string
          payment_method?: string | null
          processed_at?: string | null
          rental_id?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          driver_id?: string
          failure_reason?: string | null
          id?: string
          notification_sent?: boolean
          owner_id?: string
          payment_frequency?: string
          payment_method?: string | null
          processed_at?: string | null
          rental_id?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_rental_id_fkey"
            columns: ["rental_id"]
            isOneToOne: false
            referencedRelation: "rentals"
            referencedColumns: ["id"]
          },
        ]
      }
      paypal_transactions: {
        Row: {
          amount: number
          capture_id: string | null
          created_at: string
          currency: string
          driver_id: string
          failure_reason: string | null
          id: string
          order_id: string
          owner_id: string
          payer_email: string | null
          payer_id: string | null
          payment_id: string | null
          raw_capture_response: Json | null
          raw_order_response: Json | null
          rental_id: string | null
          status: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          amount: number
          capture_id?: string | null
          created_at?: string
          currency?: string
          driver_id: string
          failure_reason?: string | null
          id?: string
          order_id: string
          owner_id: string
          payer_email?: string | null
          payer_id?: string | null
          payment_id?: string | null
          raw_capture_response?: Json | null
          raw_order_response?: Json | null
          rental_id?: string | null
          status?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          amount?: number
          capture_id?: string | null
          created_at?: string
          currency?: string
          driver_id?: string
          failure_reason?: string | null
          id?: string
          order_id?: string
          owner_id?: string
          payer_email?: string | null
          payer_id?: string | null
          payment_id?: string | null
          raw_capture_response?: Json | null
          raw_order_response?: Json | null
          rental_id?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paypal_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paypal_transactions_rental_id_fkey"
            columns: ["rental_id"]
            isOneToOne: false
            referencedRelation: "rentals"
            referencedColumns: ["id"]
          },
        ]
      }
      paystack_transactions: {
        Row: {
          access_code: string | null
          amount: number
          authorization_url: string | null
          channel: string | null
          created_at: string
          currency: string
          driver_id: string | null
          failure_reason: string | null
          gateway_response: string | null
          id: string
          payment_id: string | null
          raw_payload: Json | null
          reference: string
          rental_id: string | null
          status: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          access_code?: string | null
          amount: number
          authorization_url?: string | null
          channel?: string | null
          created_at?: string
          currency: string
          driver_id?: string | null
          failure_reason?: string | null
          gateway_response?: string | null
          id?: string
          payment_id?: string | null
          raw_payload?: Json | null
          reference: string
          rental_id?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          access_code?: string | null
          amount?: number
          authorization_url?: string | null
          channel?: string | null
          created_at?: string
          currency?: string
          driver_id?: string | null
          failure_reason?: string | null
          gateway_response?: string | null
          id?: string
          payment_id?: string | null
          raw_payload?: Json | null
          reference?: string
          rental_id?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paystack_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paystack_transactions_rental_id_fkey"
            columns: ["rental_id"]
            isOneToOne: false
            referencedRelation: "rentals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paystack_transactions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      persona_inquiries: {
        Row: {
          created_at: string
          id: string
          inquiry_id: string | null
          mismatch_fields: Json
          raw_payload: Json
          region: string | null
          status: string
          subject_ref: string | null
          subject_type: string
          template_id: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inquiry_id?: string | null
          mismatch_fields?: Json
          raw_payload?: Json
          region?: string | null
          status?: string
          subject_ref?: string | null
          subject_type: string
          template_id?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inquiry_id?: string | null
          mismatch_fields?: Json
          raw_payload?: Json
          region?: string | null
          status?: string
          subject_ref?: string | null
          subject_type?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      persona_region_templates: {
        Row: {
          auto_generated: boolean
          country_code: string
          created_at: string
          environment_id: string | null
          id: string
          inquiry_template_id: string | null
          is_active: boolean
          provision_error: string | null
          provision_status: string
          provisioned_at: string | null
          region_id: string | null
          source_template_id: string | null
          updated_at: string
        }
        Insert: {
          auto_generated?: boolean
          country_code: string
          created_at?: string
          environment_id?: string | null
          id?: string
          inquiry_template_id?: string | null
          is_active?: boolean
          provision_error?: string | null
          provision_status?: string
          provisioned_at?: string | null
          region_id?: string | null
          source_template_id?: string | null
          updated_at?: string
        }
        Update: {
          auto_generated?: boolean
          country_code?: string
          created_at?: string
          environment_id?: string | null
          id?: string
          inquiry_template_id?: string | null
          is_active?: boolean
          provision_error?: string | null
          provision_status?: string
          provisioned_at?: string | null
          region_id?: string | null
          source_template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "persona_region_templates_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "region_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_cities: {
        Row: {
          center_lat: number | null
          center_lng: number | null
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          region_id: string
          search_radius_miles: number | null
          updated_at: string
        }
        Insert: {
          center_lat?: number | null
          center_lng?: number | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          region_id: string
          search_radius_miles?: number | null
          updated_at?: string
        }
        Update: {
          center_lat?: number | null
          center_lng?: number | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          region_id?: string
          search_radius_miles?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_cities_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "platform_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_countries: {
        Row: {
          code: string
          created_at: string
          currency_code: string
          currency_symbol: string
          display_order: number
          flag: string
          id: string
          is_active: boolean
          name: string
          payment_gateway: string
          phone_prefix: string
          timezone: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          currency_code: string
          currency_symbol: string
          display_order?: number
          flag?: string
          id?: string
          is_active?: boolean
          name: string
          payment_gateway?: string
          phone_prefix: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          display_order?: number
          flag?: string
          id?: string
          is_active?: boolean
          name?: string
          payment_gateway?: string
          phone_prefix?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_email_config: {
        Row: {
          description: string | null
          email: string
          id: string
          is_active: boolean
          key: string
          sender_name: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          email: string
          id?: string
          is_active?: boolean
          key: string
          sender_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          email?: string
          id?: string
          is_active?: boolean
          key?: string
          sender_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_feature_overrides: {
        Row: {
          city_id: string | null
          country_id: string | null
          created_at: string
          feature_id: string
          id: string
          is_enabled: boolean
          notes: string | null
          overridden_at: string | null
          overridden_by: string | null
          region_id: string | null
          scope: Database["public"]["Enums"]["feature_scope"]
          updated_at: string
        }
        Insert: {
          city_id?: string | null
          country_id?: string | null
          created_at?: string
          feature_id: string
          id?: string
          is_enabled: boolean
          notes?: string | null
          overridden_at?: string | null
          overridden_by?: string | null
          region_id?: string | null
          scope: Database["public"]["Enums"]["feature_scope"]
          updated_at?: string
        }
        Update: {
          city_id?: string | null
          country_id?: string | null
          created_at?: string
          feature_id?: string
          id?: string
          is_enabled?: boolean
          notes?: string | null
          overridden_at?: string | null
          overridden_by?: string | null
          region_id?: string | null
          scope?: Database["public"]["Enums"]["feature_scope"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_feature_overrides_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "platform_cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_feature_overrides_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "platform_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_feature_overrides_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "platform_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_feature_overrides_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "platform_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_features: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_global_default: boolean
          key: string
          name: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_global_default?: boolean
          key: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_global_default?: boolean
          key?: string
          name?: string
        }
        Relationships: []
      }
      platform_regions: {
        Row: {
          center_lat: number | null
          center_lng: number | null
          code: string
          country_id: string
          created_at: string
          display_order: number
          forwarding_notes: string | null
          forwarding_sms: string | null
          forwarding_whatsapp: string | null
          id: string
          is_active: boolean
          map_zoom: number | null
          name: string
          requires_police_report: boolean | null
          updated_at: string
        }
        Insert: {
          center_lat?: number | null
          center_lng?: number | null
          code: string
          country_id: string
          created_at?: string
          display_order?: number
          forwarding_notes?: string | null
          forwarding_sms?: string | null
          forwarding_whatsapp?: string | null
          id?: string
          is_active?: boolean
          map_zoom?: number | null
          name: string
          requires_police_report?: boolean | null
          updated_at?: string
        }
        Update: {
          center_lat?: number | null
          center_lng?: number | null
          code?: string
          country_id?: string
          created_at?: string
          display_order?: number
          forwarding_notes?: string | null
          forwarding_sms?: string | null
          forwarding_whatsapp?: string | null
          id?: string
          is_active?: boolean
          map_zoom?: number | null
          name?: string
          requires_police_report?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_regions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "platform_countries"
            referencedColumns: ["id"]
          },
        ]
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
          email_verified: boolean | null
          full_name: string | null
          id: string
          identity_verification_status: string | null
          identity_verified_at: string | null
          identity_verified_inquiry_id: string | null
          is_active: boolean
          notification_email: boolean | null
          notification_sms: boolean | null
          notification_whatsapp: boolean | null
          payments_suspended: boolean
          phone: string | null
          phone_verification_code: string | null
          phone_verification_expires_at: string | null
          phone_verified: boolean | null
          preferred_country: string | null
          region_mode: string | null
          suspended_call_in_id: string | null
          suspended_reason: string | null
          suspended_until: string | null
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
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          identity_verification_status?: string | null
          identity_verified_at?: string | null
          identity_verified_inquiry_id?: string | null
          is_active?: boolean
          notification_email?: boolean | null
          notification_sms?: boolean | null
          notification_whatsapp?: boolean | null
          payments_suspended?: boolean
          phone?: string | null
          phone_verification_code?: string | null
          phone_verification_expires_at?: string | null
          phone_verified?: boolean | null
          preferred_country?: string | null
          region_mode?: string | null
          suspended_call_in_id?: string | null
          suspended_reason?: string | null
          suspended_until?: string | null
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
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          identity_verification_status?: string | null
          identity_verified_at?: string | null
          identity_verified_inquiry_id?: string | null
          is_active?: boolean
          notification_email?: boolean | null
          notification_sms?: boolean | null
          notification_whatsapp?: boolean | null
          payments_suspended?: boolean
          phone?: string | null
          phone_verification_code?: string | null
          phone_verification_expires_at?: string | null
          phone_verified?: boolean | null
          preferred_country?: string | null
          region_mode?: string | null
          suspended_call_in_id?: string | null
          suspended_reason?: string | null
          suspended_until?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rate_limit_log: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          identifier: string
          request_count: number
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          request_count?: number
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      reconciliation_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          details: Json
          id: string
          message: string
          psp: string | null
          run_id: string | null
          severity: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          details?: Json
          id?: string
          message: string
          psp?: string | null
          run_id?: string | null
          severity?: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          details?: Json
          id?: string
          message?: string
          psp?: string | null
          run_id?: string | null
          severity?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_alerts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_runs: {
        Row: {
          backfilled_payment_ids: string[]
          created_at: string
          duration_ms: number | null
          errors: Json
          fatal_error: string | null
          finished_at: string | null
          id: string
          per_psp: Json
          since: string
          started_at: string
          status: string
          total_backfilled: number
          total_checked: number
          total_errors: number
          total_updated: number
          triggered_by: string
          updated_at: string
        }
        Insert: {
          backfilled_payment_ids?: string[]
          created_at?: string
          duration_ms?: number | null
          errors?: Json
          fatal_error?: string | null
          finished_at?: string | null
          id?: string
          per_psp?: Json
          since: string
          started_at?: string
          status?: string
          total_backfilled?: number
          total_checked?: number
          total_errors?: number
          total_updated?: number
          triggered_by?: string
          updated_at?: string
        }
        Update: {
          backfilled_payment_ids?: string[]
          created_at?: string
          duration_ms?: number | null
          errors?: Json
          fatal_error?: string | null
          finished_at?: string | null
          id?: string
          per_psp?: Json
          since?: string
          started_at?: string
          status?: string
          total_backfilled?: number
          total_checked?: number
          total_errors?: number
          total_updated?: number
          triggered_by?: string
          updated_at?: string
        }
        Relationships: []
      }
      referee_verifications: {
        Row: {
          application_id: string
          attestation_comments: string | null
          attestation_response: string | null
          attestation_sent_at: string | null
          attestation_status: string
          attestation_token: string | null
          attested_at: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          id_number: string | null
          id_type: string | null
          last_notified_at: string | null
          mismatch_reason: string | null
          notified_channels: Json
          persona_inquiry_id: string | null
          phone: string | null
          referee_index: number
          status: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          application_id: string
          attestation_comments?: string | null
          attestation_response?: string | null
          attestation_sent_at?: string | null
          attestation_status?: string
          attestation_token?: string | null
          attested_at?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          id_number?: string | null
          id_type?: string | null
          last_notified_at?: string | null
          mismatch_reason?: string | null
          notified_channels?: Json
          persona_inquiry_id?: string | null
          phone?: string | null
          referee_index: number
          status?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          application_id?: string
          attestation_comments?: string | null
          attestation_response?: string | null
          attestation_sent_at?: string | null
          attestation_status?: string
          attestation_token?: string | null
          attested_at?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          id_number?: string | null
          id_type?: string | null
          last_notified_at?: string | null
          mismatch_reason?: string | null
          notified_channels?: Json
          persona_inquiry_id?: string | null
          phone?: string | null
          referee_index?: number
          status?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referee_verifications_persona_inquiry_id_fkey"
            columns: ["persona_inquiry_id"]
            isOneToOne: false
            referencedRelation: "persona_inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      region_definitions: {
        Row: {
          build_error: string | null
          build_log: Json | null
          country_code: string
          country_name: string
          created_at: string
          created_by: string | null
          cultural_tone: string | null
          currency: string
          currency_symbol: string
          default_payment_gateway: string | null
          flag_emoji: string | null
          id: string
          payment_gateway: string
          payment_gateways: string[]
          phone_prefix: string
          primary_language: string | null
          sms_number: string | null
          sms_provider: string
          status: string
          support_hours: string | null
          timezone: string | null
          updated_at: string
          voice_provider: string
          whatsapp_number: string | null
          whatsapp_provider: string
        }
        Insert: {
          build_error?: string | null
          build_log?: Json | null
          country_code: string
          country_name: string
          created_at?: string
          created_by?: string | null
          cultural_tone?: string | null
          currency: string
          currency_symbol: string
          default_payment_gateway?: string | null
          flag_emoji?: string | null
          id?: string
          payment_gateway?: string
          payment_gateways?: string[]
          phone_prefix: string
          primary_language?: string | null
          sms_number?: string | null
          sms_provider?: string
          status?: string
          support_hours?: string | null
          timezone?: string | null
          updated_at?: string
          voice_provider?: string
          whatsapp_number?: string | null
          whatsapp_provider?: string
        }
        Update: {
          build_error?: string | null
          build_log?: Json | null
          country_code?: string
          country_name?: string
          created_at?: string
          created_by?: string | null
          cultural_tone?: string | null
          currency?: string
          currency_symbol?: string
          default_payment_gateway?: string | null
          flag_emoji?: string | null
          id?: string
          payment_gateway?: string
          payment_gateways?: string[]
          phone_prefix?: string
          primary_language?: string | null
          sms_number?: string | null
          sms_provider?: string
          status?: string
          support_hours?: string | null
          timezone?: string | null
          updated_at?: string
          voice_provider?: string
          whatsapp_number?: string | null
          whatsapp_provider?: string
        }
        Relationships: []
      }
      region_localized_content: {
        Row: {
          content: Json
          content_key: string
          created_at: string
          generated_by: string | null
          id: string
          region_id: string
          updated_at: string
        }
        Insert: {
          content: Json
          content_key: string
          created_at?: string
          generated_by?: string | null
          id?: string
          region_id: string
          updated_at?: string
        }
        Update: {
          content?: Json
          content_key?: string
          created_at?: string
          generated_by?: string | null
          id?: string
          region_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "region_localized_content_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "region_definitions"
            referencedColumns: ["id"]
          },
        ]
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
      rentals: {
        Row: {
          created_at: string
          currency: string
          daily_rate: number
          driver_id: string
          end_date: string
          extended_end_date: string | null
          extension_approved: boolean | null
          extension_requested: boolean
          id: string
          owner_id: string
          payment_frequency: string
          pickup_location: string | null
          region: string
          return_confirmed_at: string | null
          return_inspection_notes: string | null
          return_location: string | null
          return_reminder_sent: boolean
          start_date: string
          status: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          daily_rate: number
          driver_id: string
          end_date: string
          extended_end_date?: string | null
          extension_approved?: boolean | null
          extension_requested?: boolean
          id?: string
          owner_id: string
          payment_frequency?: string
          pickup_location?: string | null
          region?: string
          return_confirmed_at?: string | null
          return_inspection_notes?: string | null
          return_location?: string | null
          return_reminder_sent?: boolean
          start_date?: string
          status?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          daily_rate?: number
          driver_id?: string
          end_date?: string
          extended_end_date?: string | null
          extension_approved?: boolean | null
          extension_requested?: boolean
          id?: string
          owner_id?: string
          payment_frequency?: string
          pickup_location?: string | null
          region?: string
          return_confirmed_at?: string | null
          return_inspection_notes?: string | null
          return_location?: string | null
          return_reminder_sent?: boolean
          start_date?: string
          status?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rentals_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      rideshare_profile_submissions: {
        Row: {
          admin_notes: string | null
          admin_reviewed_at: string | null
          admin_reviewed_by: string | null
          created_at: string
          current_rating: number | null
          driver_id: string
          id: string
          platform: string | null
          profile_photo_url: string | null
          rating_screenshot_url: string | null
          status: string | null
          submitted_at: string | null
          updated_at: string
          vehicle_id: string | null
          week_start_date: string
        }
        Insert: {
          admin_notes?: string | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          created_at?: string
          current_rating?: number | null
          driver_id: string
          id?: string
          platform?: string | null
          profile_photo_url?: string | null
          rating_screenshot_url?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string
          vehicle_id?: string | null
          week_start_date: string
        }
        Update: {
          admin_notes?: string | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          created_at?: string
          current_rating?: number | null
          driver_id?: string
          id?: string
          platform?: string | null
          profile_photo_url?: string | null
          rating_screenshot_url?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string
          vehicle_id?: string | null
          week_start_date?: string
        }
        Relationships: []
      }
      roadside_partners: {
        Row: {
          coverage_area: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string
          rating: number | null
          region: string
          response_time_minutes: number | null
          service_type: string
          updated_at: string
        }
        Insert: {
          coverage_area: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone: string
          rating?: number | null
          region?: string
          response_time_minutes?: number | null
          service_type: string
          updated_at?: string
        }
        Update: {
          coverage_area?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string
          rating?: number | null
          region?: string
          response_time_minutes?: number | null
          service_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          new_role: Database["public"]["Enums"]["app_role"] | null
          notes: string | null
          old_role: Database["public"]["Enums"]["app_role"] | null
          target_user_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          new_role?: Database["public"]["Enums"]["app_role"] | null
          notes?: string | null
          old_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          new_role?: Database["public"]["Enums"]["app_role"] | null
          notes?: string | null
          old_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id?: string
        }
        Relationships: []
      }
      security_deposit_settings: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean
          region: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          description?: string | null
          id?: string
          is_active?: boolean
          region: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          region?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      social_media_campaigns: {
        Row: {
          budget: number | null
          campaign_type: string
          content_text: string | null
          created_at: string
          created_by: string
          currency: string
          description: string | null
          end_date: string | null
          external_campaign_id: string | null
          id: string
          media_urls: string[] | null
          metrics: Json | null
          name: string
          platform: string
          region: string
          start_date: string | null
          status: string
          target_audience: Json | null
          updated_at: string
        }
        Insert: {
          budget?: number | null
          campaign_type: string
          content_text?: string | null
          created_at?: string
          created_by: string
          currency?: string
          description?: string | null
          end_date?: string | null
          external_campaign_id?: string | null
          id?: string
          media_urls?: string[] | null
          metrics?: Json | null
          name: string
          platform: string
          region?: string
          start_date?: string | null
          status?: string
          target_audience?: Json | null
          updated_at?: string
        }
        Update: {
          budget?: number | null
          campaign_type?: string
          content_text?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          description?: string | null
          end_date?: string | null
          external_campaign_id?: string | null
          id?: string
          media_urls?: string[] | null
          metrics?: Json | null
          name?: string
          platform?: string
          region?: string
          start_date?: string | null
          status?: string
          target_audience?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      social_media_posts: {
        Row: {
          campaign_id: string | null
          content: string
          created_at: string
          created_by: string
          engagement_metrics: Json | null
          external_post_id: string | null
          id: string
          media_urls: string[] | null
          platform: string
          published_at: string | null
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          content: string
          created_at?: string
          created_by: string
          engagement_metrics?: Json | null
          external_post_id?: string | null
          id?: string
          media_urls?: string[] | null
          platform: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          content?: string
          created_at?: string
          created_by?: string
          engagement_metrics?: Json | null
          external_post_id?: string | null
          id?: string
          media_urls?: string[] | null
          platform?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_media_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "social_media_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      social_messaging_configs: {
        Row: {
          api_status: string
          app_id: string | null
          created_at: string
          display_name: string
          id: string
          is_enabled: boolean
          last_connected_at: string | null
          metadata: Json | null
          page_id: string | null
          platform: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          api_status?: string
          app_id?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_enabled?: boolean
          last_connected_at?: string | null
          metadata?: Json | null
          page_id?: string | null
          platform: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          api_status?: string
          app_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_enabled?: boolean
          last_connected_at?: string | null
          metadata?: Json | null
          page_id?: string | null
          platform?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          billing_interval: string
          created_at: string
          currency: string
          description: string | null
          eligible_roles: string[]
          id: string
          is_active: boolean
          name: string
          plan_type: string
          price: number
          region: string
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          created_at?: string
          currency?: string
          description?: string | null
          eligible_roles?: string[]
          id?: string
          is_active?: boolean
          name: string
          plan_type: string
          price: number
          region: string
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          created_at?: string
          currency?: string
          description?: string | null
          eligible_roles?: string[]
          id?: string
          is_active?: boolean
          name?: string
          plan_type?: string
          price?: number
          region?: string
          updated_at?: string
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
      tax_entities: {
        Row: {
          country_code: string
          created_at: string
          entity_name: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          is_active: boolean
          is_primary: boolean
          jurisdiction_code: string
          notes: string | null
          role: string
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          country_code: string
          created_at?: string
          entity_name: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
          is_active?: boolean
          is_primary?: boolean
          jurisdiction_code: string
          notes?: string | null
          role?: string
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          entity_name?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          is_active?: boolean
          is_primary?: boolean
          jurisdiction_code?: string
          notes?: string | null
          role?: string
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tax_line_items: {
        Row: {
          created_at: string
          currency: string
          exemption_reason: string | null
          id: string
          is_exempt: boolean
          jurisdiction_code: string
          payment_id: string | null
          rental_id: string | null
          tax_amount: number
          tax_rate: number
          tax_rule_id: string | null
          tax_type: Database["public"]["Enums"]["tax_type"]
          taxable_amount: number
        }
        Insert: {
          created_at?: string
          currency: string
          exemption_reason?: string | null
          id?: string
          is_exempt?: boolean
          jurisdiction_code: string
          payment_id?: string | null
          rental_id?: string | null
          tax_amount: number
          tax_rate: number
          tax_rule_id?: string | null
          tax_type: Database["public"]["Enums"]["tax_type"]
          taxable_amount: number
        }
        Update: {
          created_at?: string
          currency?: string
          exemption_reason?: string | null
          id?: string
          is_exempt?: boolean
          jurisdiction_code?: string
          payment_id?: string | null
          rental_id?: string | null
          tax_amount?: number
          tax_rate?: number
          tax_rule_id?: string | null
          tax_type?: Database["public"]["Enums"]["tax_type"]
          taxable_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_line_items_tax_rule_id_fkey"
            columns: ["tax_rule_id"]
            isOneToOne: false
            referencedRelation: "tax_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_nexus_tracking: {
        Row: {
          created_at: string
          cumulative_revenue: number
          cumulative_transactions: number
          currency: string
          id: string
          jurisdiction_code: string
          jurisdiction_name: string
          nexus_triggered: boolean
          nexus_triggered_at: string | null
          period_month: number
          period_year: number
          threshold_revenue: number | null
          threshold_transactions: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cumulative_revenue?: number
          cumulative_transactions?: number
          currency?: string
          id?: string
          jurisdiction_code: string
          jurisdiction_name: string
          nexus_triggered?: boolean
          nexus_triggered_at?: string | null
          period_month: number
          period_year: number
          threshold_revenue?: number | null
          threshold_transactions?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cumulative_revenue?: number
          cumulative_transactions?: number
          currency?: string
          id?: string
          jurisdiction_code?: string
          jurisdiction_name?: string
          nexus_triggered?: boolean
          nexus_triggered_at?: string | null
          period_month?: number
          period_year?: number
          threshold_revenue?: number | null
          threshold_transactions?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      tax_reporting_periods: {
        Row: {
          created_at: string
          currency: string
          entity_id: string | null
          exempt_revenue: number
          filed_at: string | null
          gross_revenue: number
          id: string
          jurisdiction_code: string
          period_quarter: number
          period_year: number
          status: string
          tax_collected: number
          tax_owed: number
          tax_remitted: number
          tax_type: Database["public"]["Enums"]["tax_type"]
          taxable_revenue: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency: string
          entity_id?: string | null
          exempt_revenue?: number
          filed_at?: string | null
          gross_revenue?: number
          id?: string
          jurisdiction_code: string
          period_quarter: number
          period_year: number
          status?: string
          tax_collected?: number
          tax_owed?: number
          tax_remitted?: number
          tax_type: Database["public"]["Enums"]["tax_type"]
          taxable_revenue?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          entity_id?: string | null
          exempt_revenue?: number
          filed_at?: string | null
          gross_revenue?: number
          id?: string
          jurisdiction_code?: string
          period_quarter?: number
          period_year?: number
          status?: string
          tax_collected?: number
          tax_owed?: number
          tax_remitted?: number
          tax_type?: Database["public"]["Enums"]["tax_type"]
          taxable_revenue?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_reporting_periods_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "tax_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rules: {
        Row: {
          applies_to: string
          created_at: string
          effective_from: string
          effective_to: string | null
          exemption_reason: string | null
          id: string
          is_active: boolean
          is_exempt: boolean
          jurisdiction_code: string
          jurisdiction_level: Database["public"]["Enums"]["tax_jurisdiction_level"]
          jurisdiction_name: string
          notes: string | null
          rate_percent: number
          tax_type: Database["public"]["Enums"]["tax_type"]
          threshold_amount: number | null
          threshold_currency: string | null
          threshold_transactions: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          applies_to?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          exemption_reason?: string | null
          id?: string
          is_active?: boolean
          is_exempt?: boolean
          jurisdiction_code: string
          jurisdiction_level: Database["public"]["Enums"]["tax_jurisdiction_level"]
          jurisdiction_name: string
          notes?: string | null
          rate_percent?: number
          tax_type: Database["public"]["Enums"]["tax_type"]
          threshold_amount?: number | null
          threshold_currency?: string | null
          threshold_transactions?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          applies_to?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          exemption_reason?: string | null
          id?: string
          is_active?: boolean
          is_exempt?: boolean
          jurisdiction_code?: string
          jurisdiction_level?: Database["public"]["Enums"]["tax_jurisdiction_level"]
          jurisdiction_name?: string
          notes?: string | null
          rate_percent?: number
          tax_type?: Database["public"]["Enums"]["tax_type"]
          threshold_amount?: number | null
          threshold_currency?: string | null
          threshold_transactions?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      telemetry_providers: {
        Row: {
          api_key_secret_name: string | null
          base_url: string | null
          config: Json
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          name: string
          priority: number
          region_scope: string
          updated_at: string
        }
        Insert: {
          api_key_secret_name?: string | null
          base_url?: string | null
          config?: Json
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          region_scope?: string
          updated_at?: string
        }
        Update: {
          api_key_secret_name?: string | null
          base_url?: string | null
          config?: Json
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          region_scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      telemetry_shadow_log: {
        Row: {
          created_at: string
          device_id: string | null
          divergence_score: number | null
          id: string
          notes: string | null
          primary_lat: number | null
          primary_lng: number | null
          primary_online: boolean | null
          primary_provider: string
          shadow_lat: number | null
          shadow_lng: number | null
          shadow_online: boolean | null
          shadow_provider: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          divergence_score?: number | null
          id?: string
          notes?: string | null
          primary_lat?: number | null
          primary_lng?: number | null
          primary_online?: boolean | null
          primary_provider: string
          shadow_lat?: number | null
          shadow_lng?: number | null
          shadow_online?: boolean | null
          shadow_provider: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          divergence_score?: number | null
          id?: string
          notes?: string | null
          primary_lat?: number | null
          primary_lng?: number | null
          primary_online?: boolean | null
          primary_provider?: string
          shadow_lat?: number | null
          shadow_lng?: number | null
          shadow_online?: boolean | null
          shadow_provider?: string
          vehicle_id?: string | null
        }
        Relationships: []
      }
      training_completions: {
        Row: {
          completed_at: string
          id: string
          module_id: string
          score: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          module_id: string
          score?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          module_id?: string
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_completions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      training_modules: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean
          module_order: number
          region: string
          script_content: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          module_order?: number
          region?: string
          script_content?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          module_order?: number
          region?: string
          script_content?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      training_refresh_requirements: {
        Row: {
          created_at: string
          id: string
          last_completed_at: string | null
          next_due_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_completed_at?: string | null
          next_due_at: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_completed_at?: string | null
          next_due_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      two_factor_audit_log: {
        Row: {
          action: string
          channel: string | null
          created_at: string
          failure_reason: string | null
          id: string
          ip_address: string | null
          phone_number: string | null
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          channel?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          phone_number?: string | null
          success?: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          channel?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          phone_number?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      two_factor_settings: {
        Row: {
          created_at: string
          enabled_at: string | null
          id: string
          is_enabled: boolean
          is_mandatory: boolean
          phone_number: string | null
          preferred_channel: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled_at?: string | null
          id?: string
          is_enabled?: boolean
          is_mandatory?: boolean
          phone_number?: string | null
          preferred_channel?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled_at?: string | null
          id?: string
          is_enabled?: boolean
          is_mandatory?: boolean
          phone_number?: string | null
          preferred_channel?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      unified_message_log: {
        Row: {
          conversation_id: string | null
          created_at: string
          delivery_status: string
          direction: string
          error_message: string | null
          event_count: number | null
          forwarded_at: string | null
          forwarded_message_id: string | null
          forwarded_to: string | null
          id: string
          interactive_reply: boolean | null
          is_negotiation: boolean | null
          language: string | null
          last_event_at: string | null
          last_event_type: string | null
          message_body: string
          message_type: string
          metadata: Json | null
          priority: string | null
          provider: string
          provider_message_id: string | null
          region: string
          response_time_ms: number | null
          retry_count: number
          template_name: string | null
          updated_at: string
          user_id: string | null
          user_name: string | null
          user_phone: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          delivery_status?: string
          direction: string
          error_message?: string | null
          event_count?: number | null
          forwarded_at?: string | null
          forwarded_message_id?: string | null
          forwarded_to?: string | null
          id?: string
          interactive_reply?: boolean | null
          is_negotiation?: boolean | null
          language?: string | null
          last_event_at?: string | null
          last_event_type?: string | null
          message_body: string
          message_type?: string
          metadata?: Json | null
          priority?: string | null
          provider: string
          provider_message_id?: string | null
          region: string
          response_time_ms?: number | null
          retry_count?: number
          template_name?: string | null
          updated_at?: string
          user_id?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          delivery_status?: string
          direction?: string
          error_message?: string | null
          event_count?: number | null
          forwarded_at?: string | null
          forwarded_message_id?: string | null
          forwarded_to?: string | null
          id?: string
          interactive_reply?: boolean | null
          is_negotiation?: boolean | null
          language?: string | null
          last_event_at?: string | null
          last_event_type?: string | null
          message_body?: string
          message_type?: string
          metadata?: Json | null
          priority?: string | null
          provider?: string
          provider_message_id?: string | null
          region?: string
          response_time_ms?: number | null
          retry_count?: number
          template_name?: string | null
          updated_at?: string
          user_id?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_message_log_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "inbox_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_documents: {
        Row: {
          created_at: string
          document_category: string
          document_type: string
          expires_at: string | null
          expiry_date: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          rejection_reason: string | null
          status: string
          updated_at: string
          user_id: string
          vehicle_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          document_category: string
          document_type: string
          expires_at?: string | null
          expiry_date?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          document_category?: string
          document_type?: string
          expires_at?: string | null
          expiry_date?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_documents_vehicle_id_fkey"
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
      user_subscriptions: {
        Row: {
          auto_renew: boolean
          created_at: string
          expires_at: string
          id: string
          payment_method: string | null
          payment_reference: string | null
          plan_id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          expires_at: string
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          plan_id: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          plan_id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_category_prices: {
        Row: {
          category: string
          created_at: string
          currency: string
          id: string
          min_price: number | null
          price: number
          region: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          currency?: string
          id?: string
          min_price?: number | null
          price: number
          region: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          currency?: string
          id?: string
          min_price?: number | null
          price?: number
          region?: string
          updated_at?: string
        }
        Relationships: []
      }
      vehicle_category_year_specs: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          label: string
          max_year: number
          min_year: number
          region: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          max_year: number
          min_year: number
          region: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          max_year?: number
          min_year?: number
          region?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      vehicle_geofences: {
        Row: {
          active: boolean
          breached_at: string | null
          call_in_id: string
          center_lat: number
          center_lng: number
          created_at: string
          id: string
          last_checked_at: string | null
          last_distance_m: number | null
          radius_m: number
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          active?: boolean
          breached_at?: string | null
          call_in_id: string
          center_lat: number
          center_lng: number
          created_at?: string
          id?: string
          last_checked_at?: string | null
          last_distance_m?: number | null
          radius_m?: number
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          active?: boolean
          breached_at?: string | null
          call_in_id?: string
          center_lat?: number
          center_lng?: number
          created_at?: string
          id?: string
          last_checked_at?: string | null
          last_distance_m?: number | null
          radius_m?: number
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_geofences_call_in_id_fkey"
            columns: ["call_in_id"]
            isOneToOne: false
            referencedRelation: "driver_call_ins"
            referencedColumns: ["id"]
          },
        ]
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
      vehicle_mqtt_credentials: {
        Row: {
          broker_port: number
          broker_url: string
          client_id: string
          created_at: string
          id: string
          installed_at: string | null
          installed_by: string | null
          iot_device_id: string | null
          is_active: boolean
          jwt_expires_at: string | null
          jwt_issued_at: string | null
          jwt_token: string | null
          last_connected_at: string | null
          mqtt_username: string
          notes: string | null
          password_hash: string
          password_hint: string | null
          publish_topics: string[]
          subscribe_topics: string[]
          tls_enabled: boolean
          topic_prefix: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          broker_port?: number
          broker_url?: string
          client_id: string
          created_at?: string
          id?: string
          installed_at?: string | null
          installed_by?: string | null
          iot_device_id?: string | null
          is_active?: boolean
          jwt_expires_at?: string | null
          jwt_issued_at?: string | null
          jwt_token?: string | null
          last_connected_at?: string | null
          mqtt_username: string
          notes?: string | null
          password_hash: string
          password_hint?: string | null
          publish_topics?: string[]
          subscribe_topics?: string[]
          tls_enabled?: boolean
          topic_prefix: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          broker_port?: number
          broker_url?: string
          client_id?: string
          created_at?: string
          id?: string
          installed_at?: string | null
          installed_by?: string | null
          iot_device_id?: string | null
          is_active?: boolean
          jwt_expires_at?: string | null
          jwt_issued_at?: string | null
          jwt_token?: string | null
          last_connected_at?: string | null
          mqtt_username?: string
          notes?: string | null
          password_hash?: string
          password_hint?: string | null
          publish_topics?: string[]
          subscribe_topics?: string[]
          tls_enabled?: boolean
          topic_prefix?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_mqtt_credentials_iot_device_id_fkey"
            columns: ["iot_device_id"]
            isOneToOne: false
            referencedRelation: "iot_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_recalls: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          admin_validated_at: string | null
          admin_validated_by: string | null
          admin_validation_status: string | null
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
          owner_approval_status: string | null
          owner_approved_at: string | null
          owner_id: string | null
          owner_notified_at: string | null
          priority: string
          recall_reason: string
          recall_type: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          triggered_by_call_ins: string[] | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          admin_validated_at?: string | null
          admin_validated_by?: string | null
          admin_validation_status?: string | null
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
          owner_approval_status?: string | null
          owner_approved_at?: string | null
          owner_id?: string | null
          owner_notified_at?: string | null
          priority?: string
          recall_reason: string
          recall_type?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          triggered_by_call_ins?: string[] | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          admin_validated_at?: string | null
          admin_validated_by?: string | null
          admin_validation_status?: string | null
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
          owner_approval_status?: string | null
          owner_approved_at?: string | null
          owner_id?: string | null
          owner_notified_at?: string | null
          priority?: string
          recall_reason?: string
          recall_type?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          triggered_by_call_ins?: string[] | null
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
          inspection_expiry: string | null
          insurance_expiry: string | null
          license_plate: string
          make: string
          model: string
          owner_id: string
          pickup_address: string | null
          pickup_city: string | null
          pickup_instructions: string | null
          pickup_location: string | null
          registration_expiry: string | null
          status: string | null
          updated_at: string | null
          vin: string | null
          year: number
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          inspection_expiry?: string | null
          insurance_expiry?: string | null
          license_plate: string
          make: string
          model: string
          owner_id: string
          pickup_address?: string | null
          pickup_city?: string | null
          pickup_instructions?: string | null
          pickup_location?: string | null
          registration_expiry?: string | null
          status?: string | null
          updated_at?: string | null
          vin?: string | null
          year: number
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          inspection_expiry?: string | null
          insurance_expiry?: string | null
          license_plate?: string
          make?: string
          model?: string
          owner_id?: string
          pickup_address?: string | null
          pickup_city?: string | null
          pickup_instructions?: string | null
          pickup_location?: string | null
          registration_expiry?: string | null
          status?: string | null
          updated_at?: string | null
          vin?: string | null
          year?: number
        }
        Relationships: []
      }
      voice_call_permissions: {
        Row: {
          caller_role: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          receiver_role: string
          requires_rental_link: boolean
          updated_at: string
        }
        Insert: {
          caller_role: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          receiver_role: string
          requires_rental_link?: boolean
          updated_at?: string
        }
        Update: {
          caller_role?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          receiver_role?: string
          requires_rental_link?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      voice_call_requests: {
        Row: {
          assigned_to: string | null
          call_id: string | null
          created_at: string
          id: string
          reason: string | null
          region: string
          requester_id: string
          requester_role: string
          resolved_at: string | null
          status: string
          target_id: string | null
          target_role: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          call_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          region?: string
          requester_id: string
          requester_role: string
          resolved_at?: string | null
          status?: string
          target_id?: string | null
          target_role: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          call_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          region?: string
          requester_id?: string
          requester_role?: string
          resolved_at?: string | null
          status?: string
          target_id?: string | null
          target_role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_call_requests_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "voip_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      voicemail_logs: {
        Row: {
          call_sid: string | null
          callback_queue: string | null
          created_at: string
          id: string
          personalized_message: string | null
          region: string | null
          script_type: string
          sms_followup_sent: boolean | null
          sms_link_sent: boolean | null
          updated_at: string
          user_id: string
          voicemail_detected: boolean | null
        }
        Insert: {
          call_sid?: string | null
          callback_queue?: string | null
          created_at?: string
          id?: string
          personalized_message?: string | null
          region?: string | null
          script_type: string
          sms_followup_sent?: boolean | null
          sms_link_sent?: boolean | null
          updated_at?: string
          user_id: string
          voicemail_detected?: boolean | null
        }
        Update: {
          call_sid?: string | null
          callback_queue?: string | null
          created_at?: string
          id?: string
          personalized_message?: string | null
          region?: string | null
          script_type?: string
          sms_followup_sent?: boolean | null
          sms_link_sent?: boolean | null
          updated_at?: string
          user_id?: string
          voicemail_detected?: boolean | null
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
      voip_call_requests: {
        Row: {
          admin_notes: string | null
          callback_scheduled_at: string | null
          called_back_at: string | null
          called_back_by: string | null
          created_at: string
          id: string
          phone_number: string
          priority: string
          reason: string | null
          region: string
          status: string
          updated_at: string
          user_id: string
          user_type: string
        }
        Insert: {
          admin_notes?: string | null
          callback_scheduled_at?: string | null
          called_back_at?: string | null
          called_back_by?: string | null
          created_at?: string
          id?: string
          phone_number: string
          priority?: string
          reason?: string | null
          region: string
          status?: string
          updated_at?: string
          user_id: string
          user_type: string
        }
        Update: {
          admin_notes?: string | null
          callback_scheduled_at?: string | null
          called_back_at?: string | null
          called_back_by?: string | null
          created_at?: string
          id?: string
          phone_number?: string
          priority?: string
          reason?: string | null
          region?: string
          status?: string
          updated_at?: string
          user_id?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "voip_call_requests_called_back_by_fkey"
            columns: ["called_back_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "voip_call_requests_user_id_fkey"
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
          caller_role: string | null
          created_at: string
          direction: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          initiated_by: string | null
          receiver_id: string | null
          receiver_role: string | null
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
          caller_role?: string | null
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          initiated_by?: string | null
          receiver_id?: string | null
          receiver_role?: string | null
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
          caller_role?: string | null
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          initiated_by?: string | null
          receiver_id?: string | null
          receiver_role?: string | null
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
      voip_settings: {
        Row: {
          created_at: string
          description: string | null
          feature_key: string
          id: string
          is_enabled: boolean
          region: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          feature_key: string
          id?: string
          is_enabled?: boolean
          region?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          feature_key?: string
          id?: string
          is_enabled?: boolean
          region?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voip_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempt_number: number
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_headers: Json | null
          response_status: number | null
          status: string
          webhook_id: string
        }
        Insert: {
          attempt_number?: number
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          response_body?: string | null
          response_headers?: Json | null
          response_status?: number | null
          status?: string
          webhook_id: string
        }
        Update: {
          attempt_number?: number
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_headers?: Json | null
          response_status?: number | null
          status?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          events: string[]
          failure_count: number
          headers: Json | null
          id: string
          is_active: boolean
          last_triggered_at: string | null
          name: string
          retry_count: number
          secret: string | null
          success_count: number
          timeout_seconds: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          events?: string[]
          failure_count?: number
          headers?: Json | null
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name: string
          retry_count?: number
          secret?: string | null
          success_count?: number
          timeout_seconds?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          events?: string[]
          failure_count?: number
          headers?: Json | null
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name?: string
          retry_count?: number
          secret?: string | null
          success_count?: number
          timeout_seconds?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
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
          photo_rideshare_profile: string | null
          photo_timestamps: Json | null
          region: string | null
          report_frequency: string | null
          report_type: string | null
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
          photo_rideshare_profile?: string | null
          photo_timestamps?: Json | null
          region?: string | null
          report_frequency?: string | null
          report_type?: string | null
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
          photo_rideshare_profile?: string | null
          photo_timestamps?: Json | null
          region?: string | null
          report_frequency?: string | null
          report_type?: string | null
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
      whatsapp_interactive_flows: {
        Row: {
          completed: boolean | null
          created_at: string
          current_step: number | null
          data: Json | null
          flow_id: string | null
          flow_type: string
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          current_step?: number | null
          data?: Json | null
          flow_id?: string | null
          flow_type: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          current_step?: number | null
          data?: Json | null
          flow_id?: string | null
          flow_type?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      whatsapp_message_delivery: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          message_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          status: string
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_delivery_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["message_id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          content: string | null
          created_at: string
          direction: string
          id: string
          language: string | null
          media_url: string | null
          message_id: string | null
          message_type: string
          metadata: Json | null
          status: string | null
          template_name: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          direction: string
          id?: string
          language?: string | null
          media_url?: string | null
          message_id?: string | null
          message_type: string
          metadata?: Json | null
          status?: string | null
          template_name?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          direction?: string
          id?: string
          language?: string | null
          media_url?: string | null
          message_id?: string | null
          message_type?: string
          metadata?: Json | null
          status?: string | null
          template_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      whatsapp_sessions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          last_activity: string | null
          session_data: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_activity?: string | null
          session_data?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_activity?: string | null
          session_data?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      whatsapp_template_usage: {
        Row: {
          created_at: string
          id: string
          language: string | null
          status: string | null
          template_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string | null
          status?: string | null
          template_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          language?: string | null
          status?: string | null
          template_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      latest_application_pipeline_status: {
        Row: {
          actor_id: string | null
          application_id: string | null
          created_at: string | null
          details: Json | null
          event_type: string | null
          message: string | null
          status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assistant_can_access_user: { Args: { _target: string }; Returns: boolean }
      get_linked_user_ids: {
        Args: { _user_id: string }
        Returns: {
          linked_user_id: string
        }[]
      }
      get_support_staff_city: {
        Args: {
          _type: Database["public"]["Enums"]["support_task_type"]
          _user_id: string
        }
        Returns: string
      }
      has_admin_assistant_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
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
      log_admin_action: {
        Args: {
          _action: string
          _details?: Json
          _target_id?: string
          _target_table?: string
        }
        Returns: string
      }
      no_pending_application_for_email: {
        Args: { _email: string }
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
        | "admin_assistant"
      application_status:
        | "pending"
        | "under_review"
        | "approved"
        | "rejected"
        | "needs_info"
      application_type: "driver" | "owner"
      call_in_status:
        | "active"
        | "expired"
        | "cancelled"
        | "breached"
        | "resolved"
      call_in_type: "fault" | "maintenance" | "sick"
      device_status: "inactive" | "active" | "offline" | "maintenance"
      entity_type: "operating_company" | "payment_entity" | "individual"
      feature_scope: "country" | "region" | "city"
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
        | "insurance"
        | "payment_accounts"
      tax_jurisdiction_level: "country" | "state" | "city"
      tax_type:
        | "income_tax"
        | "vat"
        | "sales_tax"
        | "withholding_tax"
        | "service_tax"
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
        "admin_assistant",
      ],
      application_status: [
        "pending",
        "under_review",
        "approved",
        "rejected",
        "needs_info",
      ],
      application_type: ["driver", "owner"],
      call_in_status: [
        "active",
        "expired",
        "cancelled",
        "breached",
        "resolved",
      ],
      call_in_type: ["fault", "maintenance", "sick"],
      device_status: ["inactive", "active", "offline", "maintenance"],
      entity_type: ["operating_company", "payment_entity", "individual"],
      feature_scope: ["country", "region", "city"],
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
        "insurance",
        "payment_accounts",
      ],
      tax_jurisdiction_level: ["country", "state", "city"],
      tax_type: [
        "income_tax",
        "vat",
        "sales_tax",
        "withholding_tax",
        "service_tax",
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
