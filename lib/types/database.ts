export type ContentType =
  | 'youtube'
  | 'instagram'
  | 'tiktok'
  | 'article'
  | 'course'
  | 'tweet'
  | 'github'
  | 'other'

export type LinkStatus = 'unread' | 'watching' | 'read' | 'favorite' | 'archived'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      links: {
        Row: {
          id: string
          user_id: string
          url: string
          title: string | null
          description: string | null
          image_url: string | null
          site_name: string | null
          content_type: ContentType
          notes: string | null
          status: LinkStatus
          is_favorite: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          url: string
          title?: string | null
          description?: string | null
          image_url?: string | null
          site_name?: string | null
          content_type?: ContentType
          notes?: string | null
          status?: LinkStatus
          is_favorite?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          url?: string
          title?: string | null
          description?: string | null
          image_url?: string | null
          site_name?: string | null
          content_type?: ContentType
          notes?: string | null
          status?: LinkStatus
          is_favorite?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          color?: string | null
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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      content_type: ContentType
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
