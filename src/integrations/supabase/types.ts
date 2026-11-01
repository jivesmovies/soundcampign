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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          active: boolean
          created_at: string
          id: string
          message: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          message: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          message?: string
        }
        Relationships: []
      }
      mock_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          note: string | null
          reviewed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind: string
          note?: string | null
          reviewed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          reviewed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          balance: number
          created_at: string
          created_by: string | null
          credit_score: number
          display_name: string | null
          id: string
          invite_code: string
          is_training: boolean
          level_locked: boolean
          phone: string | null
          referred_by: string | null
          suspended: boolean
          team_size: number
          total_earned: number
          updated_at: string
          username: string
          vip_level: number
        }
        Insert: {
          avatar_url?: string | null
          balance?: number
          created_at?: string
          created_by?: string | null
          credit_score?: number
          display_name?: string | null
          id: string
          invite_code?: string
          is_training?: boolean
          level_locked?: boolean
          phone?: string | null
          referred_by?: string | null
          suspended?: boolean
          team_size?: number
          total_earned?: number
          updated_at?: string
          username: string
          vip_level?: number
        }
        Update: {
          avatar_url?: string | null
          balance?: number
          created_at?: string
          created_by?: string | null
          credit_score?: number
          display_name?: string | null
          id?: string
          invite_code?: string
          is_training?: boolean
          level_locked?: boolean
          phone?: string | null
          referred_by?: string | null
          suspended?: boolean
          team_size?: number
          total_earned?: number
          updated_at?: string
          username?: string
          vip_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_contacts: {
        Row: {
          channel: string
          revision: number
          updated_at: string
          value: string | null
        }
        Insert: {
          channel: string
          revision?: number
          updated_at?: string
          value?: string | null
        }
        Update: {
          channel?: string
          revision?: number
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          attachments: Json
          body: string
          created_at: string
          id: string
          read_by_admin: boolean
          read_by_user: boolean
          sender: string
          user_id: string
        }
        Insert: {
          attachments?: Json
          body?: string
          created_at?: string
          id?: string
          read_by_admin?: boolean
          read_by_user?: boolean
          sender: string
          user_id: string
        }
        Update: {
          attachments?: Json
          body?: string
          created_at?: string
          id?: string
          read_by_admin?: boolean
          read_by_user?: boolean
          sender?: string
          user_id?: string
        }
        Relationships: []
      }
      trending_songs: {
        Row: {
          artist: string
          audio_url: string | null
          created_at: string
          duration: string | null
          id: string
          position: number
          poster: string | null
          title: string
          updated_at: string
        }
        Insert: {
          artist: string
          audio_url?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          position?: number
          poster?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          artist?: string
          audio_url?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          position?: number
          poster?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_exclusive_tasks: {
        Row: {
          amount: number
          commission: number
          consumed: boolean
          created_at: string
          id: string
          name: string
          position: number
          poster: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          commission?: number
          consumed?: boolean
          created_at?: string
          id?: string
          name: string
          position: number
          poster?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          commission?: number
          consumed?: boolean
          created_at?: string
          id?: string
          name?: string
          position?: number
          poster?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_rewards: {
        Row: {
          amount: number
          claimed_at: string | null
          created_at: string
          id: string
          kind: string
          note: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          claimed_at?: string | null
          created_at?: string
          id?: string
          kind: string
          note?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          claimed_at?: string | null
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_task_settings: {
        Row: {
          created_at: string
          group_assigned: boolean
          group_seed: number
          updated_at: string
          upgrade_position: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          group_assigned?: boolean
          group_seed?: number
          updated_at?: string
          upgrade_position?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          group_assigned?: boolean
          group_seed?: number
          updated_at?: string
          upgrade_position?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          address: string
          asset: string
          created_at: string
          id: string
          label: string | null
          user_id: string
        }
        Insert: {
          address: string
          asset: string
          created_at?: string
          id?: string
          label?: string | null
          user_id: string
        }
        Update: {
          address?: string
          asset?: string
          created_at?: string
          id?: string
          label?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vip_plans: {
        Row: {
          created_at: string
          cycle_days: number
          daily_income: number
          id: number
          image_url: string | null
          name: string
          price: number
          total_return: number
        }
        Insert: {
          created_at?: string
          cycle_days: number
          daily_income: number
          id: number
          image_url?: string | null
          name: string
          price: number
          total_return: number
        }
        Update: {
          created_at?: string
          cycle_days?: number
          daily_income?: number
          id?: number
          image_url?: string | null
          name?: string
          price?: number
          total_return?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_account_funds: {
        Args: { p_delta: number; p_earned_delta?: number; p_user: string }
        Returns: Json
      }
      admin_owns_training: {
        Args: { _admin: string; _user: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_registration_invite_valid: { Args: { code: string }; Returns: boolean }
      is_restricted_admin: { Args: { _user_id: string }; Returns: boolean }
      save_platform_config_field: {
        Args: { p_expected: Json; p_field: string; p_value: Json }
        Returns: Json
      }
      save_support_contact: {
        Args: {
          p_channel: string
          p_expected_revision: number
          p_remove?: boolean
          p_value: string
        }
        Returns: {
          channel: string
          revision: number
          updated_at: string
          value: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "support_contacts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      app_role: "admin" | "user" | "super_admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user", "super_admin"],
    },
  },
} as const
