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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          avatar_url: string | null
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          is_system: boolean
          max_tokens: number
          name: string
          provider_profile_id: string | null
          source_system_agent_id: string | null
          system_prompt: string
          temperature: number
          unlimited_tokens: boolean | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_system?: boolean
          max_tokens?: number
          name: string
          provider_profile_id?: string | null
          source_system_agent_id?: string | null
          system_prompt: string
          temperature?: number
          unlimited_tokens?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_system?: boolean
          max_tokens?: number
          name?: string
          provider_profile_id?: string | null
          source_system_agent_id?: string | null
          system_prompt?: string
          temperature?: number
          unlimited_tokens?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_provider_profile_id_fkey"
            columns: ["provider_profile_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_provider_profile_id_fkey"
            columns: ["provider_profile_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_source_system_agent_id_fkey"
            columns: ["source_system_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      one_on_one_messages: {
        Row: {
          agent_color: string | null
          agent_id: string | null
          agent_name: string | null
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          agent_color?: string | null
          agent_id?: string | null
          agent_name?: string | null
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          agent_color?: string | null
          agent_id?: string | null
          agent_name?: string | null
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "one_on_one_messages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_on_one_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "one_on_one_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      one_on_one_sessions: {
        Row: {
          created_at: string
          id: string
          last_agent_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_agent_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_agent_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "one_on_one_sessions_last_agent_id_fkey"
            columns: ["last_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_profiles: {
        Row: {
          api_key: string
          created_at: string
          endpoint: string | null
          id: string
          is_default: boolean
          model: string | null
          name: string
          provider_type: Database["public"]["Enums"]["provider_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          endpoint?: string | null
          id?: string
          is_default?: boolean
          model?: string | null
          name: string
          provider_type: Database["public"]["Enums"]["provider_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          endpoint?: string | null
          id?: string
          is_default?: boolean
          model?: string | null
          name?: string
          provider_type?: Database["public"]["Enums"]["provider_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      room_templates: {
        Row: {
          agent_ids: string[]
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          max_rounds: number
          name: string
          objective: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_ids?: string[]
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          max_rounds?: number
          name: string
          objective?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_ids?: string[]
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          max_rounds?: number
          name?: string
          objective?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      rooms: {
        Row: {
          agent_ids: string[]
          available_tools: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_system: boolean | null
          max_rounds: number
          methodology: string
          name: string
          objective_template: string | null
          require_consensus: boolean | null
          updated_at: string | null
          user_id: string | null
          workflow_type: string
        }
        Insert: {
          agent_ids?: string[]
          available_tools?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          max_rounds?: number
          methodology?: string
          name: string
          objective_template?: string | null
          require_consensus?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          workflow_type?: string
        }
        Update: {
          agent_ids?: string[]
          available_tools?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          max_rounds?: number
          methodology?: string
          name?: string
          objective_template?: string | null
          require_consensus?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          workflow_type?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          action_items: Json | null
          agent_config: Json
          completed_at: string | null
          created_at: string
          current_round: number
          id: string
          max_rounds: number
          objective: string | null
          results: Json | null
          room_id: string | null
          room_template_id: string | null
          status: Database["public"]["Enums"]["session_status"]
          topic: string
          transcript: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          action_items?: Json | null
          agent_config?: Json
          completed_at?: string | null
          created_at?: string
          current_round?: number
          id?: string
          max_rounds?: number
          objective?: string | null
          results?: Json | null
          room_id?: string | null
          room_template_id?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          topic: string
          transcript?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          action_items?: Json | null
          agent_config?: Json
          completed_at?: string | null
          created_at?: string
          current_round?: number
          id?: string
          max_rounds?: number
          objective?: string | null
          results?: Json | null
          room_id?: string | null
          room_template_id?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          topic?: string
          transcript?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_room_template_id_fkey"
            columns: ["room_template_id"]
            isOneToOne: false
            referencedRelation: "room_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      provider_profiles_decrypted: {
        Row: {
          api_key: string | null
          created_at: string | null
          endpoint: string | null
          id: string | null
          is_default: boolean | null
          model: string | null
          name: string | null
          provider_type: Database["public"]["Enums"]["provider_type"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          api_key?: never
          created_at?: string | null
          endpoint?: string | null
          id?: string | null
          is_default?: boolean | null
          model?: string | null
          name?: string | null
          provider_type?: Database["public"]["Enums"]["provider_type"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          api_key?: never
          created_at?: string | null
          endpoint?: string | null
          id?: string | null
          is_default?: boolean | null
          model?: string | null
          name?: string | null
          provider_type?: Database["public"]["Enums"]["provider_type"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      decrypt_api_key: { Args: { encrypted_key: string }; Returns: string }
      encrypt_api_key: { Args: { plain_key: string }; Returns: string }
    }
    Enums: {
      provider_type: "openai" | "anthropic" | "custom" | "perplexity" | "tavily"
      session_status: "draft" | "running" | "completed" | "cancelled"
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
      provider_type: ["openai", "anthropic", "custom", "perplexity", "tavily"],
      session_status: ["draft", "running", "completed", "cancelled"],
    },
  },
} as const
