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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      galerie_photos: {
        Row: {
          accueil: boolean
          banniere: boolean
          categorie: string
          chemin: string | null
          created_at: string
          id: string
          ordre: number
          texte_alt: string
          titre: string
          updated_at: string
          url_statique: string | null
          visible: boolean
        }
        Insert: {
          accueil?: boolean
          banniere?: boolean
          categorie?: string
          chemin?: string | null
          created_at?: string
          id?: string
          ordre?: number
          texte_alt?: string
          titre?: string
          updated_at?: string
          url_statique?: string | null
          visible?: boolean
        }
        Update: {
          accueil?: boolean
          banniere?: boolean
          categorie?: string
          chemin?: string | null
          created_at?: string
          id?: string
          ordre?: number
          texte_alt?: string
          titre?: string
          updated_at?: string
          url_statique?: string | null
          visible?: boolean
        }
        Relationships: []
      }
      horaires_ouverture: {
        Row: {
          created_at: string
          ferme: boolean
          heure_debut: string
          heure_fin: string
          id: string
          jour_semaine: number
          pause_debut: string | null
          pause_fin: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          ferme?: boolean
          heure_debut?: string
          heure_fin?: string
          id?: string
          jour_semaine: number
          pause_debut?: string | null
          pause_fin?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          ferme?: boolean
          heure_debut?: string
          heure_fin?: string
          id?: string
          jour_semaine?: number
          pause_debut?: string | null
          pause_fin?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      indisponibilites: {
        Row: {
          created_at: string
          date_debut: string
          date_fin: string
          id: string
          motif: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_debut: string
          date_fin: string
          id?: string
          motif?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_debut?: string
          date_fin?: string
          id?: string
          motif?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          city: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          phone: string | null
          source: string
          status: string
          type: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          source?: string
          status?: string
          type?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          source?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
      prestations: {
        Row: {
          actif: boolean
          categorie: string
          couleur: string
          created_at: string
          description: string
          duree_minutes: number
          en_option: boolean
          id: string
          nom: string
          ordre: number
          prix: number
          sur_devis: boolean
          updated_at: string
        }
        Insert: {
          actif?: boolean
          categorie?: string
          couleur?: string
          created_at?: string
          description?: string
          duree_minutes: number
          en_option?: boolean
          id?: string
          nom: string
          ordre?: number
          prix: number
          sur_devis?: boolean
          updated_at?: string
        }
        Update: {
          actif?: boolean
          categorie?: string
          couleur?: string
          created_at?: string
          description?: string
          duree_minutes?: number
          en_option?: boolean
          id?: string
          nom?: string
          ordre?: number
          prix?: number
          sur_devis?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      reglages: {
        Row: {
          battement_minutes: number
          id: number
          updated_at: string
        }
        Insert: {
          battement_minutes?: number
          id?: number
          updated_at?: string
        }
        Update: {
          battement_minutes?: number
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      push_abonnements: {
        Row: {
          appareil: string
          auth: string
          cree_le: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          appareil?: string
          auth: string
          cree_le?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          appareil?: string
          auth?: string
          cree_le?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      push_cles: {
        Row: {
          cle_privee_jwk: Json
          cle_publique: string
          cree_le: string
          id: number
        }
        Insert: {
          cle_privee_jwk: Json
          cle_publique: string
          cree_le?: string
          id?: number
        }
        Update: {
          cle_privee_jwk?: Json
          cle_publique?: string
          cree_le?: string
          id?: number
        }
        Relationships: []
      }
      push_envois_quotidiens: {
        Row: {
          envoye_le: string
          jour: string
        }
        Insert: {
          envoye_le?: string
          jour: string
        }
        Update: {
          envoye_le?: string
          jour?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          acompte_expire_le: string | null
          acompte_montant: number | null
          acompte_paye_le: string | null
          acompte_statut: string
          cliente_email: string
          cliente_nom: string
          cliente_prenom: string
          cliente_telephone: string
          commentaire: string | null
          cree_le: string
          date_debut: string
          date_fin: string
          fin_bloquee: string
          id: string
          mode_paiement: string
          montant_paye: number | null
          montant_rembourse: number
          prestation_id: string
          prestations_detail: Json | null
          prix_total: number | null
          statut: string
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          token_annulation: string
          updated_at: string
        }
        Insert: {
          acompte_expire_le?: string | null
          acompte_montant?: number | null
          acompte_paye_le?: string | null
          acompte_statut?: string
          cliente_email: string
          cliente_nom: string
          cliente_prenom: string
          cliente_telephone: string
          commentaire?: string | null
          cree_le?: string
          date_debut: string
          date_fin: string
          fin_bloquee: string
          id?: string
          mode_paiement?: string
          montant_paye?: number | null
          montant_rembourse?: number
          prestation_id: string
          prestations_detail?: Json | null
          prix_total?: number | null
          statut?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          token_annulation?: string
          updated_at?: string
        }
        Update: {
          acompte_expire_le?: string | null
          acompte_montant?: number | null
          acompte_paye_le?: string | null
          acompte_statut?: string
          cliente_email?: string
          cliente_nom?: string
          cliente_prenom?: string
          cliente_telephone?: string
          commentaire?: string | null
          cree_le?: string
          date_debut?: string
          date_fin?: string
          fin_bloquee?: string
          id?: string
          mode_paiement?: string
          montant_paye?: number | null
          montant_rembourse?: number
          prestation_id?: string
          prestations_detail?: Json | null
          prix_total?: number | null
          statut?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          token_annulation?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_prestation_id_fkey"
            columns: ["prestation_id"]
            isOneToOne: false
            referencedRelation: "prestations"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      annuler_reservation: { Args: { p_token: string }; Returns: boolean }
      battement_actuel: { Args: never; Returns: number }
      get_creneaux_disponibles: {
        Args: { date_recherche: string; prestation_id: string }
        Returns: {
          heure_debut: string
        }[]
      }
      get_creneaux_disponibles_duree: {
        Args: { date_recherche: string; p_duree: number }
        Returns: {
          heure_debut: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff"
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
      app_role: ["admin", "staff"],
    },
  },
} as const
