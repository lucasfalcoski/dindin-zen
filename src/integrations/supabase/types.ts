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
      accounts: {
        Row: {
          balance: number
          bank_name: string | null
          color: string
          created_at: string
          id: string
          name: string
          type: Database["public"]["Enums"]["account_type"]
          user_id: string
        }
        Insert: {
          balance?: number
          bank_name?: string | null
          color?: string
          created_at?: string
          id?: string
          name: string
          type?: Database["public"]["Enums"]["account_type"]
          user_id: string
        }
        Update: {
          balance?: number
          bank_name?: string | null
          color?: string
          created_at?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["account_type"]
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount: number
          created_at: string
          group_id: string
          id: string
          month: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          group_id: string
          id?: string
          month: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          group_id?: string
          id?: string
          month?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "expense_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          account_id: string | null
          closing_day: number
          color: string
          created_at: string
          due_day: number
          id: string
          limit: number
          name: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          closing_day?: number
          color?: string
          created_at?: string
          due_day?: number
          id?: string
          limit?: number
          name: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          closing_day?: number
          color?: string
          created_at?: string
          due_day?: number
          id?: string
          limit?: number
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_groups: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_default: boolean
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      expense_tags: {
        Row: {
          expense_id: string
          tag_id: string
        }
        Insert: {
          expense_id: string
          tag_id: string
        }
        Update: {
          expense_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_tags_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          credit_card_id: string | null
          date: string
          description: string
          group_id: string
          id: string
          installment_current: number | null
          installment_group_id: string | null
          installment_total: number | null
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          recurrent: boolean
          split_group_id: string | null
          user_id: string
          visibility: Database["public"]["Enums"]["visibility_type"]
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string
          credit_card_id?: string | null
          date?: string
          description: string
          group_id: string
          id?: string
          installment_current?: number | null
          installment_group_id?: string | null
          installment_total?: number | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          recurrent?: boolean
          split_group_id?: string | null
          user_id: string
          visibility?: Database["public"]["Enums"]["visibility_type"]
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          credit_card_id?: string | null
          date?: string
          description?: string
          group_id?: string
          id?: string
          installment_current?: number | null
          installment_group_id?: string | null
          installment_total?: number | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          recurrent?: boolean
          split_group_id?: string | null
          user_id?: string
          visibility?: Database["public"]["Enums"]["visibility_type"]
        }
        Relationships: [
          {
            foreignKeyName: "expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "expense_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      family_budgets: {
        Row: {
          amount: number
          created_at: string
          family_id: string
          group_id: string
          id: string
          month: string
        }
        Insert: {
          amount?: number
          created_at?: string
          family_id: string
          group_id: string
          id?: string
          month: string
        }
        Update: {
          amount?: number
          created_at?: string
          family_id?: string
          group_id?: string
          id?: string
          month?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_budgets_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_budgets_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "expense_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          family_id: string
          id: string
          invite_token: string | null
          invited_at: string | null
          invited_email: string | null
          joined_at: string | null
          role: Database["public"]["Enums"]["family_role"]
          status: Database["public"]["Enums"]["family_status"]
          user_id: string | null
        }
        Insert: {
          family_id: string
          id?: string
          invite_token?: string | null
          invited_at?: string | null
          invited_email?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["family_role"]
          status?: Database["public"]["Enums"]["family_status"]
          user_id?: string | null
        }
        Update: {
          family_id?: string
          id?: string
          invite_token?: string | null
          invited_at?: string | null
          invited_email?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["family_role"]
          status?: Database["public"]["Enums"]["family_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_contributions: {
        Row: {
          amount: number
          created_at: string
          date: string
          goal_id: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          goal_id: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          goal_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          color: string
          created_at: string
          current_amount: number
          deadline: string | null
          icon: string
          id: string
          name: string
          target_amount: number
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          current_amount?: number
          deadline?: string | null
          icon?: string
          id?: string
          name: string
          target_amount: number
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          current_amount?: number
          deadline?: string | null
          icon?: string
          id?: string
          name?: string
          target_amount?: number
          user_id?: string
        }
        Relationships: []
      }
      incomes: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["income_category"]
          created_at: string
          date: string
          description: string
          id: string
          notes: string | null
          recurrent: boolean
          user_id: string
          visibility: Database["public"]["Enums"]["visibility_type"]
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["income_category"]
          created_at?: string
          date?: string
          description: string
          id?: string
          notes?: string | null
          recurrent?: boolean
          user_id: string
          visibility?: Database["public"]["Enums"]["visibility_type"]
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["income_category"]
          created_at?: string
          date?: string
          description?: string
          id?: string
          notes?: string | null
          recurrent?: boolean
          user_id?: string
          visibility?: Database["public"]["Enums"]["visibility_type"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_color: string
          avatar_emoji: string | null
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          avatar_color?: string
          avatar_emoji?: string | null
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          avatar_color?: string
          avatar_emoji?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      settlements: {
        Row: {
          amount: number
          created_at: string
          family_id: string
          from_user_id: string
          id: string
          notes: string | null
          settled_at: string
          to_user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          family_id: string
          from_user_id: string
          id?: string
          notes?: string | null
          settled_at?: string
          to_user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          family_id?: string
          from_user_id?: string
          id?: string
          notes?: string | null
          settled_at?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_transactions: {
        Row: {
          created_at: string
          error_message: string | null
          expense_id: string | null
          id: string
          income_id: string | null
          parsed_amount: number | null
          parsed_date: string
          parsed_description: string | null
          parsed_type: string | null
          phone: string
          raw_message: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          expense_id?: string | null
          id?: string
          income_id?: string | null
          parsed_amount?: number | null
          parsed_date?: string
          parsed_description?: string | null
          parsed_type?: string | null
          phone: string
          raw_message: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          expense_id?: string | null
          id?: string
          income_id?: string | null
          parsed_amount?: number | null
          parsed_date?: string
          parsed_description?: string | null
          parsed_type?: string | null
          phone?: string
          raw_message?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_users: {
        Row: {
          created_at: string
          id: string
          phone: string
          user_id: string
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          phone: string
          user_id: string
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          phone?: string
          user_id?: string
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { _token: string }; Returns: Json }
      get_user_family_ids: { Args: { _user_id: string }; Returns: string[] }
      is_family_admin: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      is_family_member: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      account_type: "corrente" | "poupanca" | "carteira" | "investimento"
      family_role: "admin" | "member"
      family_status: "pending" | "active"
      income_category:
        | "salario"
        | "freelance"
        | "investimento"
        | "presente"
        | "outro"
      payment_method:
        | "dinheiro"
        | "debito"
        | "credito"
        | "pix"
        | "transferencia"
        | "outro"
      visibility_type: "personal" | "family"
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
      account_type: ["corrente", "poupanca", "carteira", "investimento"],
      family_role: ["admin", "member"],
      family_status: ["pending", "active"],
      income_category: [
        "salario",
        "freelance",
        "investimento",
        "presente",
        "outro",
      ],
      payment_method: [
        "dinheiro",
        "debito",
        "credito",
        "pix",
        "transferencia",
        "outro",
      ],
      visibility_type: ["personal", "family"],
    },
  },
} as const
