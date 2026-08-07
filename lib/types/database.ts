export type LinkStatus = 'unread' | 'watching' | 'read' | 'archived'
export type UserRole = 'user' | 'admin'
export type AccentColor = string
export type SurfaceFamily = string
export type ThemeMode = 'light' | 'dark' | 'system'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          role: UserRole
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: UserRole
          updated_at?: string
        }
        Relationships: []
      }
      links: {
        Row: {
          id: string
          user_id: string
          enc_payload: string
          enc_iv: string
          url_fingerprint: string
          category_id: string | null
          status: LinkStatus
          is_favorite: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          enc_payload: string
          enc_iv: string
          url_fingerprint: string
          category_id?: string | null
          status?: LinkStatus
          is_favorite?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          enc_payload?: string
          enc_iv?: string
          url_fingerprint?: string
          category_id?: string | null
          status?: LinkStatus
          is_favorite?: boolean
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          id: string
          user_id: string
          enc_payload: string
          enc_iv: string
          is_private: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          enc_payload: string
          enc_iv: string
          is_private?: boolean
          created_at?: string
        }
        Update: {
          enc_payload?: string
          enc_iv?: string
          is_private?: boolean
        }
        Relationships: []
      }
      private_tag_settings: {
        Row: {
          id: string
          user_id: string
          password_hash: string
          hint: string | null
          failed_attempts: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          password_hash: string
          hint?: string | null
          failed_attempts?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          password_hash?: string
          hint?: string | null
          failed_attempts?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          auto_fetch_enabled: boolean
          accent_color_light: AccentColor
          accent_color_dark: AccentColor
          surface_family: SurfaceFamily
          theme_mode: ThemeMode
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          auto_fetch_enabled?: boolean
          accent_color_light?: AccentColor
          accent_color_dark?: AccentColor
          surface_family?: SurfaceFamily
          theme_mode?: ThemeMode
          created_at?: string
          updated_at?: string
        }
        Update: {
          auto_fetch_enabled?: boolean
          accent_color_light?: AccentColor
          accent_color_dark?: AccentColor
          surface_family?: SurfaceFamily
          theme_mode?: ThemeMode
          updated_at?: string
        }
        Relationships: []
      }
      link_tags: {
        Row: {
          id: string
          link_id: string
          tag_id: string
        }
        Insert: {
          id?: string
          link_id: string
          tag_id: string
        }
        Update: {
          link_id?: string
          tag_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          user_id: string
          enc_payload: string
          enc_iv: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          enc_payload: string
          enc_iv: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          enc_payload?: string
          enc_iv?: string
          updated_at?: string
        }
        Relationships: []
      }
      category_domains: {
        Row: {
          id: string
          category_id: string
          user_id: string
          enc_payload: string
          enc_iv: string
          created_at: string
        }
        Insert: {
          id?: string
          category_id: string
          user_id: string
          enc_payload: string
          enc_iv: string
          created_at?: string
        }
        Update: {
          enc_payload?: string
          enc_iv?: string
        }
        Relationships: []
      }
      user_encryption_keys: {
        Row: {
          id: string
          user_id: string
          salt: string
          wrapped_dek: string
          wrapped_dek_iv: string
          kdf_iterations: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          salt: string
          wrapped_dek: string
          wrapped_dek_iv: string
          kdf_iterations?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          salt?: string
          wrapped_dek?: string
          wrapped_dek_iv?: string
          kdf_iterations?: number
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          registrations_enabled: boolean
          restart_account_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          registrations_enabled?: boolean
          restart_account_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          registrations_enabled?: boolean
          restart_account_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      search_links: {
        Args: {
          p_category_id: string | null
          p_statuses: LinkStatus[] | null
          p_tag_ids: string[] | null
          p_tag_mode: string
          p_favorites_only: boolean
          p_unlocked_tag_ids: string[] | null
          p_sort_by: string
          p_limit: number
          p_offset: number
        }
        Returns: Array<Database['public']['Tables']['links']['Row'] & { tags: string[]; total_count: number }>
      }
      search_link_ids: {
        Args: {
          p_category_id: string | null
          p_statuses: LinkStatus[] | null
          p_tag_ids: string[] | null
          p_tag_mode: string
          p_favorites_only: boolean
          p_unlocked_tag_ids: string[] | null
          p_limit: number
        }
        Returns: Array<{ id: string; total_count: number }>
      }
    }
    Enums: {
      link_status: LinkStatus
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type User = Tables<'users'>
export type Link = Tables<'links'>
export type Tag = Tables<'tags'>
export type LinkTag = Tables<'link_tags'>
export type Category = Tables<'categories'>
export type CategoryDomain = Tables<'category_domains'>
export type PrivateTagSettings = Tables<'private_tag_settings'>
export type UserPreferences = Tables<'user_preferences'>
export type AppSettings = Tables<'app_settings'>
export type UserEncryptionKey = Tables<'user_encryption_keys'>
