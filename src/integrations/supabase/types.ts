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
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "owner" | "driver"
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
      negotiation_status:
        | "pending"
        | "counter_offer"
        | "approved"
        | "rejected"
        | "locked"
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
      app_role: ["admin", "owner", "driver"],
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
      negotiation_status: [
        "pending",
        "counter_offer",
        "approved",
        "rejected",
        "locked",
      ],
    },
  },
} as const
