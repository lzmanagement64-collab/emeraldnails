export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      bookings: {
        Row: {
          appointment_date: string;
          city: string | null;
          created_at: string;
          customer_type: string;
          deposit_amount: number;
          deposit_status: string;
          duration_minutes: number;
          email: string;
          end_time: string;
          first_name: string;
          id: string;
          instagram: string | null;
          last_name: string;
          notes: string | null;
          options: Json;
          phone: string;
          preferences: Json;
          remaining_balance: number;
          service_id: string;
          service_name: string;
          source: string;
          start_time: string;
          status: string;
          total_amount: number;
          updated_at: string;
        };
        Insert: {
          appointment_date: string;
          city?: string | null;
          created_at?: string;
          customer_type?: string;
          deposit_amount: number;
          deposit_status?: string;
          duration_minutes: number;
          email: string;
          end_time: string;
          first_name: string;
          id?: string;
          instagram?: string | null;
          last_name: string;
          notes?: string | null;
          options?: Json;
          phone: string;
          preferences?: Json;
          remaining_balance: number;
          service_id: string;
          service_name: string;
          source?: string;
          start_time: string;
          status?: string;
          total_amount: number;
          updated_at?: string;
        };
        Update: {
          appointment_date?: string;
          city?: string | null;
          created_at?: string;
          customer_type?: string;
          deposit_amount?: number;
          deposit_status?: string;
          duration_minutes?: number;
          email?: string;
          end_time?: string;
          first_name?: string;
          id?: string;
          instagram?: string | null;
          last_name?: string;
          notes?: string | null;
          options?: Json;
          phone?: string;
          preferences?: Json;
          remaining_balance?: number;
          service_id?: string;
          service_name?: string;
          source?: string;
          start_time?: string;
          status?: string;
          total_amount?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      horaires_ouverture: {
        Row: {
          created_at: string;
          ferme: boolean;
          heure_debut: string;
          heure_fin: string;
          id: string;
          jour_semaine: number;
          pause_debut: string | null;
          pause_fin: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          ferme?: boolean;
          heure_debut?: string;
          heure_fin?: string;
          id?: string;
          jour_semaine: number;
          pause_debut?: string | null;
          pause_fin?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          ferme?: boolean;
          heure_debut?: string;
          heure_fin?: string;
          id?: string;
          jour_semaine?: number;
          pause_debut?: string | null;
          pause_fin?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      indisponibilites: {
        Row: {
          created_at: string;
          date_debut: string;
          date_fin: string;
          id: string;
          motif: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          date_debut: string;
          date_fin: string;
          id?: string;
          motif?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          date_debut?: string;
          date_fin?: string;
          id?: string;
          motif?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          city: string | null;
          created_at: string;
          email: string;
          id: string;
          message: string | null;
          name: string;
          phone: string | null;
          source: string;
          status: string;
          type: string;
        };
        Insert: {
          city?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          message?: string | null;
          name: string;
          phone?: string | null;
          source?: string;
          status?: string;
          type?: string;
        };
        Update: {
          city?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          message?: string | null;
          name?: string;
          phone?: string | null;
          source?: string;
          status?: string;
          type?: string;
        };
        Relationships: [];
      };
      prestations: {
        Row: {
          actif: boolean;
          couleur: string;
          created_at: string;
          description: string;
          duree_minutes: number;
          id: string;
          nom: string;
          ordre: number;
          prix: number;
          updated_at: string;
        };
        Insert: {
          actif?: boolean;
          couleur?: string;
          created_at?: string;
          description?: string;
          duree_minutes: number;
          id?: string;
          nom: string;
          ordre?: number;
          prix: number;
          updated_at?: string;
        };
        Update: {
          actif?: boolean;
          couleur?: string;
          created_at?: string;
          description?: string;
          duree_minutes?: number;
          id?: string;
          nom?: string;
          ordre?: number;
          prix?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      reservations: {
        Row: {
          cliente_email: string;
          cliente_nom: string;
          cliente_prenom: string;
          cliente_telephone: string;
          commentaire: string | null;
          cree_le: string;
          date_debut: string;
          date_fin: string;
          id: string;
          prestation_id: string;
          statut: string;
          token_annulation: string;
          updated_at: string;
        };
        Insert: {
          cliente_email: string;
          cliente_nom: string;
          cliente_prenom: string;
          cliente_telephone: string;
          commentaire?: string | null;
          cree_le?: string;
          date_debut: string;
          date_fin: string;
          id?: string;
          prestation_id: string;
          statut?: string;
          token_annulation?: string;
          updated_at?: string;
        };
        Update: {
          cliente_email?: string;
          cliente_nom?: string;
          cliente_prenom?: string;
          cliente_telephone?: string;
          commentaire?: string | null;
          cree_le?: string;
          date_debut?: string;
          date_fin?: string;
          id?: string;
          prestation_id?: string;
          statut?: string;
          token_annulation?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_prestation_id_fkey";
            columns: ["prestation_id"];
            isOneToOne: false;
            referencedRelation: "prestations";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      annuler_reservation: { Args: { p_token: string }; Returns: boolean };
      get_creneaux_disponibles: {
        Args: { date_recherche: string; prestation_id: string };
        Returns: {
          heure_debut: string;
        }[];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "staff";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff"],
    },
  },
} as const;
