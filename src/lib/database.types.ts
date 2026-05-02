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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      class_links: {
        Row: {
          classroom_link: string
          created_at: string
          created_by: string | null
          enrollment_id: number
          id: number
          program_id: number
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          classroom_link: string
          created_at?: string
          created_by?: string | null
          enrollment_id: number
          id?: number
          program_id: number
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          classroom_link?: string
          created_at?: string
          created_by?: string | null
          enrollment_id?: number
          id?: number
          program_id?: number
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_links_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "analytics_program_registrations"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "class_links_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          amount: number | null
          checkout_id: string | null
          course_id: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          expires_at: string | null
          flw_ref: string | null
          form_data: Json | null
          id: number
          metadata: Json | null
          payment_meta: Json | null
          payment_status: string
          plan_id: number | null
          program_id: number | null
          program_title: string | null
          skill_id: number | null
          status: string
          subscription_type: string | null
          transaction_id: string | null
          tx_ref: string | null
          type: string | null
          updated_at: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
          user_whatsapp: string | null
        }
        Insert: {
          amount?: number | null
          checkout_id?: string | null
          course_id?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          expires_at?: string | null
          flw_ref?: string | null
          form_data?: Json | null
          id?: number
          metadata?: Json | null
          payment_meta?: Json | null
          payment_status?: string
          plan_id?: number | null
          program_id?: number | null
          program_title?: string | null
          skill_id?: number | null
          status?: string
          subscription_type?: string | null
          transaction_id?: string | null
          tx_ref?: string | null
          type?: string | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_whatsapp?: string | null
        }
        Update: {
          amount?: number | null
          checkout_id?: string | null
          course_id?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          expires_at?: string | null
          flw_ref?: string | null
          form_data?: Json | null
          id?: number
          metadata?: Json | null
          payment_meta?: Json | null
          payment_status?: string
          plan_id?: number | null
          program_id?: number | null
          program_title?: string | null
          skill_id?: number | null
          status?: string
          subscription_type?: string | null
          transaction_id?: string | null
          tx_ref?: string | null
          type?: string | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "analytics_program_registrations"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_plans: {
        Row: {
          created_at: string
          currency: string
          entity_id: number
          entity_type: string
          id: number
          price: number
          subscription_type: string
        }
        Insert: {
          created_at?: string
          currency?: string
          entity_id: number
          entity_type: string
          id?: never
          price: number
          subscription_type?: string
        }
        Update: {
          created_at?: string
          currency?: string
          entity_id?: number
          entity_type?: string
          id?: never
          price?: number
          subscription_type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country: string | null
          created_at: string | null
          dark_mode: boolean
          email: string | null
          full_name: string | null
          id: string
          months_remaining: number
          phone: string | null
          role: string
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          dark_mode?: boolean
          email?: string | null
          full_name?: string | null
          id: string
          months_remaining?: number
          phone?: string | null
          role?: string
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          dark_mode?: boolean
          email?: string | null
          full_name?: string | null
          id?: string
          months_remaining?: number
          phone?: string | null
          role?: string
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      program_forms: {
        Row: {
          created_at: string | null
          created_by: string | null
          form_type: Database["public"]["Enums"]["form_type"]
          id: number
          program_id: number
          schema: Json
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          form_type: Database["public"]["Enums"]["form_type"]
          id?: number
          program_id: number
          schema: Json
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          form_type?: Database["public"]["Enums"]["form_type"]
          id?: number
          program_id?: number
          schema?: Json
        }
        Relationships: [
          {
            foreignKeyName: "program_forms_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "analytics_program_registrations"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "program_forms_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string
          description: string | null
          duration: string | null
          enrollment_deadline: string | null
          faqs: Json | null
          id: number
          image_url: string | null
          instructors: Json | null
          is_flagship: boolean | null
          language: string | null
          level: string | null
          max_slots: number | null
          outcomes: string[] | null
          overview: string | null
          prerequisites: string | null
          schedule: Json | null
          slug: string
          start_date: string | null
          syllabus: string | null
          tags: string[] | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: string | null
          enrollment_deadline?: string | null
          faqs?: Json | null
          id?: number
          image_url?: string | null
          instructors?: Json | null
          is_flagship?: boolean | null
          language?: string | null
          level?: string | null
          max_slots?: number | null
          outcomes?: string[] | null
          overview?: string | null
          prerequisites?: string | null
          schedule?: Json | null
          slug: string
          start_date?: string | null
          syllabus?: string | null
          tags?: string[] | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: string | null
          enrollment_deadline?: string | null
          faqs?: Json | null
          id?: number
          image_url?: string | null
          instructors?: Json | null
          is_flagship?: boolean | null
          language?: string | null
          level?: string | null
          max_slots?: number | null
          outcomes?: string[] | null
          overview?: string | null
          prerequisites?: string | null
          schedule?: Json | null
          slug?: string
          start_date?: string | null
          syllabus?: string | null
          tags?: string[] | null
          title?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          author_name: string
          content: string
          created_at: string | null
          id: number
          updated_at: string | null
        }
        Insert: {
          author_name: string
          content: string
          created_at?: string | null
          id?: number
          updated_at?: string | null
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string | null
          id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      resources: {
        Row: {
          category: string | null
          cover_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          file_url: string
          id: number
          title: string
        }
        Insert: {
          category?: string | null
          cover_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_url: string
          id?: number
          title: string
        }
        Update: {
          category?: string | null
          cover_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_url?: string
          id?: number
          title?: string
        }
        Relationships: []
      }
      skill_forms: {
        Row: {
          created_at: string
          form_type: string | null
          id: number
          schema: Json
          skill_id: number | null
        }
        Insert: {
          created_at?: string
          form_type?: string | null
          id?: number
          schema?: Json
          skill_id?: number | null
        }
        Update: {
          created_at?: string
          form_type?: string | null
          id?: number
          schema?: Json
          skill_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_forms_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string
          description: string | null
          duration: string | null
          enrollment_deadline: string | null
          faqs: Json | null
          id: number
          image_url: string | null
          instructors: Json | null
          is_flagship: boolean | null
          language: string | null
          level: string | null
          max_slots: number | null
          outcomes: string[] | null
          overview: string | null
          prerequisites: string | null
          schedule: Json | null
          slug: string
          start_date: string | null
          tags: string[] | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: string | null
          enrollment_deadline?: string | null
          faqs?: Json | null
          id?: number
          image_url?: string | null
          instructors?: Json | null
          is_flagship?: boolean | null
          language?: string | null
          level?: string | null
          max_slots?: number | null
          outcomes?: string[] | null
          overview?: string | null
          prerequisites?: string | null
          schedule?: Json | null
          slug: string
          start_date?: string | null
          tags?: string[] | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: string | null
          enrollment_deadline?: string | null
          faqs?: Json | null
          id?: number
          image_url?: string | null
          instructors?: Json | null
          is_flagship?: boolean | null
          language?: string | null
          level?: string | null
          max_slots?: number | null
          outcomes?: string[] | null
          overview?: string | null
          prerequisites?: string | null
          schedule?: Json | null
          slug?: string
          start_date?: string | null
          tags?: string[] | null
          title?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          author_name: string
          author_title: string | null
          content: string
          created_at: string | null
          id: number
          updated_at: string | null
        }
        Insert: {
          author_name: string
          author_title?: string | null
          content: string
          created_at?: string | null
          id?: number
          updated_at?: string | null
        }
        Update: {
          author_name?: string
          author_title?: string | null
          content?: string
          created_at?: string | null
          id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      analytics_program_registrations: {
        Row: {
          program_id: number | null
          program_title: string | null
          registration_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      bulk_update_enrollments: {
        Args: {
          ids: number[]
          new_payment_status?: string
          new_status?: string
        }
        Returns: undefined
      }
      cleanup_old_drafts: { Args: never; Returns: number }
      cleanup_old_notifications: { Args: never; Returns: number }
      finalize_draft_registration: {
        Args: { draft_id: string }
        Returns: string
      }
      get_all_user_contacts: {
        Args: never
        Returns: {
          email: string
          phone: string
          source_table: string
          user_id: string
        }[]
      }
      get_all_user_contacts_v2: {
        Args: never
        Returns: {
          email: string
          full_name: string
          phone: string
          source_table: string
        }[]
      }
      get_course_enrollments_v1: {
        Args: never
        Returns: {
          email: string
          full_name: string
          item_id: number
          item_title: string
          item_type: string
          phone: string
          source_table: string
          user_id: string
        }[]
      }
      get_course_enrollments_with_status_v1: {
        Args: never
        Returns: {
          email: string
          full_name: string
          item_id: number
          item_title: string
          item_type: string
          phone: string
          source_table: string
          status: string
          user_id: string
        }[]
      }
      get_users_with_profiles: {
        Args: never
        Returns: {
          email: string
          id: string
          role: string
        }[]
      }
      is_admin: { Args: { uid?: string }; Returns: boolean }
      mark_all_notifications_read: { Args: never; Returns: number }
      mark_notification_read: {
        Args: { notification_id: string }
        Returns: boolean
      }
      promote_to_admin: { Args: { user_email: string }; Returns: undefined }
      send_broadcast_notification: {
        Args: {
          p_action_label?: string
          p_action_url?: string
          p_broadcast_role?: string
          p_message: string
          p_priority?: string
          p_sender_id?: string
          p_title: string
          p_type?: string
        }
        Returns: string
      }
      send_notification: {
        Args: {
          p_action_label?: string
          p_action_url?: string
          p_message: string
          p_priority?: string
          p_recipient_id: string
          p_related_id?: string
          p_related_type?: string
          p_sender_id?: string
          p_title: string
          p_type?: string
        }
        Returns: string
      }
      toggle_notification_pin: {
        Args: { notification_id: string; pin_status: boolean }
        Returns: boolean
      }
    }
    Enums: {
      form_type: "individual" | "family_head" | "family_member"
      plan_type: "individual" | "family"
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
      form_type: ["individual", "family_head", "family_member"],
      plan_type: ["individual", "family"],
    },
  },
} as const
