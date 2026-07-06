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
      admin_audit_logs: {
        Row: {
          action: string
          admin_user_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      admin_user_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          account_type: string
          created_at: string
          email: string
          id: string
          invited_by: string | null
          note: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          account_type?: string
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          note?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          account_type?: string
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          note?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      analytics_daily: {
        Row: {
          created_at: string
          day: string
          dimension: string
          metric: string
          value: number
        }
        Insert: {
          created_at?: string
          day: string
          dimension?: string
          metric: string
          value?: number
        }
        Update: {
          created_at?: string
          day?: string
          dimension?: string
          metric?: string
          value?: number
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          listing_id: string | null
          metadata: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          listing_id?: string | null
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          listing_id?: string | null
          metadata?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          owner_user_id: string | null
          revoked_at: string | null
          scopes: string[]
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          owner_user_id?: string | null
          revoked_at?: string | null
          scopes?: string[]
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          owner_user_id?: string | null
          revoked_at?: string | null
          scopes?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_request_logs: {
        Row: {
          api_key_id: string | null
          created_at: string
          id: string
          ip_hash: string | null
          method: string
          path: string
          status_code: number
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          method: string
          path: string
          status_code: number
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          method?: string
          path?: string
          status_code?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      application_policy_results: {
        Row: {
          application_id: string
          created_at: string
          evaluation_id: string | null
          outcomes: Json
          result: string
        }
        Insert: {
          application_id: string
          created_at?: string
          evaluation_id?: string | null
          outcomes?: Json
          result: string
        }
        Update: {
          application_id?: string
          created_at?: string
          evaluation_id?: string | null
          outcomes?: Json
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_policy_results_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "rental_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_policy_results_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "policy_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      application_profile_snapshots: {
        Row: {
          application_id: string
          created_at: string
          id: string
          snapshot: Json
          snapshot_version: number
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          snapshot: Json
          snapshot_version?: number
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          snapshot?: Json
          snapshot_version?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_profile_snapshots_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "rental_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_customers: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          stripe_customer_id: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          stripe_customer_id: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          stripe_customer_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          created_at: string
          error: string | null
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          stripe_event_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type: string
          id?: string
          payload?: Json
          processed_at?: string | null
          stripe_event_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          stripe_event_id?: string
        }
        Relationships: []
      }
      buildings: {
        Row: {
          build_year: number | null
          created_at: string
          floors: number | null
          has_elevator: boolean
          id: string
          name: string
          property_id: string
          street: string | null
        }
        Insert: {
          build_year?: number | null
          created_at?: string
          floors?: number | null
          has_elevator?: boolean
          id?: string
          name: string
          property_id: string
          street?: string | null
        }
        Update: {
          build_year?: number | null
          created_at?: string
          floors?: number | null
          has_elevator?: boolean
          id?: string
          name?: string
          property_id?: string
          street?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buildings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_url: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          placement: string
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          placement?: string
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          placement?: string
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      co_applicants: {
        Row: {
          accepted_at: string | null
          consented_at: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          invite_status: string
          invite_token: string | null
          invited_at: string | null
          invited_user_id: string | null
          phone: string | null
          relationship: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          consented_at?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          invite_status?: string
          invite_token?: string | null
          invited_at?: string | null
          invited_user_id?: string | null
          phone?: string | null
          relationship?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          consented_at?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          invite_status?: string
          invite_token?: string | null
          invited_at?: string | null
          invited_user_id?: string | null
          phone?: string | null
          relationship?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          billing_email: string | null
          business_purpose: string
          city: string | null
          company_type: string
          created_at: string
          created_by: string | null
          default_selection_method: string
          email: string | null
          id: string
          invoice_reference: string | null
          legal_form: string
          logo_url: string | null
          name: string
          notification_emails: string[]
          org_number: string | null
          organization_number: string | null
          phone: string | null
          public_description: string | null
          slug: string
          updated_at: string
          verification_note: string | null
          verification_status: string
          verified_at: string | null
          verified_by: string | null
          website: string | null
        }
        Insert: {
          billing_email?: string | null
          business_purpose?: string
          city?: string | null
          company_type?: string
          created_at?: string
          created_by?: string | null
          default_selection_method?: string
          email?: string | null
          id?: string
          invoice_reference?: string | null
          legal_form?: string
          logo_url?: string | null
          name: string
          notification_emails?: string[]
          org_number?: string | null
          organization_number?: string | null
          phone?: string | null
          public_description?: string | null
          slug: string
          updated_at?: string
          verification_note?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Update: {
          billing_email?: string | null
          business_purpose?: string
          city?: string | null
          company_type?: string
          created_at?: string
          created_by?: string | null
          default_selection_method?: string
          email?: string | null
          id?: string
          invoice_reference?: string | null
          legal_form?: string
          logo_url?: string | null
          name?: string
          notification_emails?: string[]
          org_number?: string | null
          organization_number?: string | null
          phone?: string | null
          public_description?: string | null
          slug?: string
          updated_at?: string
          verification_note?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Relationships: []
      }
      company_member_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          company_id: string
          created_at: string
          email: string
          id: string
          invite_token: string
          invited_by: string | null
          status: string
          team_role: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          company_id: string
          created_at?: string
          email: string
          id?: string
          invite_token?: string
          invited_by?: string | null
          status?: string
          team_role?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          company_id?: string
          created_at?: string
          email?: string
          id?: string
          invite_token?: string
          invited_by?: string | null
          status?: string
          team_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_member_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          team_role: string
          title: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          team_role?: string
          title?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          team_role?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          company_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_code: string
          provider: string
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          company_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_code: string
          provider?: string
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          company_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_code?: string
          provider?: string
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subscriptions_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["code"]
          },
        ]
      }
      contract_events: {
        Row: {
          actor_user_id: string | null
          contract_id: string
          created_at: string
          event_type: string
          id: string
          payload: Json
        }
        Insert: {
          actor_user_id?: string | null
          contract_id: string
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
        }
        Update: {
          actor_user_id?: string | null
          contract_id?: string
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "contract_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signers: {
        Row: {
          contract_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          provider_ref: string | null
          signed_at: string | null
          signer_role: string
          status: string
          user_id: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          provider_ref?: string | null
          signed_at?: string | null
          signer_role: string
          status?: string
          user_id?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          provider_ref?: string | null
          signed_at?: string | null
          signer_role?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_signers_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          body_template: string
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          locked_at: string | null
          name: string
          version: number
        }
        Insert: {
          body_template: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          locked_at?: string | null
          name: string
          version?: number
        }
        Update: {
          body_template?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          locked_at?: string | null
          name?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          application_id: string
          body_snapshot: string
          created_at: string
          created_by: string | null
          id: string
          listing_id: string | null
          provider: string | null
          provider_ref: string | null
          signed_at: string | null
          signed_pdf_url: string | null
          status: string
          template_id: string | null
          template_version: number | null
          updated_at: string
        }
        Insert: {
          application_id: string
          body_snapshot: string
          created_at?: string
          created_by?: string | null
          id?: string
          listing_id?: string | null
          provider?: string | null
          provider_ref?: string | null
          signed_at?: string | null
          signed_pdf_url?: string | null
          status?: string
          template_id?: string | null
          template_version?: number | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          body_snapshot?: string
          created_at?: string
          created_by?: string | null
          id?: string
          listing_id?: string | null
          provider?: string | null
          provider_ref?: string | null
          signed_at?: string | null
          signed_pdf_url?: string | null
          status?: string
          template_id?: string | null
          template_version?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "rental_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_run_logs: {
        Row: {
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          job_name: string
          result: Json | null
          started_at: string
          status: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          job_name: string
          result?: Json | null
          started_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          job_name?: string
          result?: Json | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      document_access_logs: {
        Row: {
          access_type: string
          actor_user_id: string | null
          application_document_id: string | null
          created_at: string
          document_id: string | null
          id: string
          metadata: Json
          owner_user_id: string | null
        }
        Insert: {
          access_type: string
          actor_user_id?: string | null
          application_document_id?: string | null
          created_at?: string
          document_id?: string | null
          id?: string
          metadata?: Json
          owner_user_id?: string | null
        }
        Update: {
          access_type?: string
          actor_user_id?: string | null
          application_document_id?: string | null
          created_at?: string
          document_id?: string | null
          id?: string
          metadata?: Json
          owner_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_access_logs_application_document_id_fkey"
            columns: ["application_document_id"]
            isOneToOne: false
            referencedRelation: "rental_application_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "profile_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_reviews: {
        Row: {
          created_at: string
          decision: string
          document_id: string
          id: string
          reason: string | null
          reviewer_id: string | null
        }
        Insert: {
          created_at?: string
          decision: string
          document_id: string
          id?: string
          reason?: string | null
          reviewer_id?: string | null
        }
        Update: {
          created_at?: string
          decision?: string
          document_id?: string
          id?: string
          reason?: string | null
          reviewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_reviews_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "profile_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          created_at: string
          error: string | null
          id: string
          provider: string | null
          provider_message_id: string | null
          skip_reason: string | null
          status: string
          subject: string
          template_key: string
          to_email: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          provider?: string | null
          provider_message_id?: string | null
          skip_reason?: string | null
          status: string
          subject: string
          template_key: string
          to_email: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          provider?: string | null
          provider_message_id?: string | null
          skip_reason?: string | null
          status?: string
          subject?: string
          template_key?: string
          to_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      exchange_interests: {
        Row: {
          created_at: string
          from_profile_id: string
          id: string
          status: string
          to_profile_id: string
        }
        Insert: {
          created_at?: string
          from_profile_id: string
          id?: string
          status?: string
          to_profile_id: string
        }
        Update: {
          created_at?: string
          from_profile_id?: string
          id?: string
          status?: string
          to_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_interests_from_profile_id_fkey"
            columns: ["from_profile_id"]
            isOneToOne: false
            referencedRelation: "exchange_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_interests_to_profile_id_fkey"
            columns: ["to_profile_id"]
            isOneToOne: false
            referencedRelation: "exchange_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_matches: {
        Row: {
          created_at: string
          id: string
          profile_a: string
          profile_b: string
          status: string
          thread_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_a: string
          profile_b: string
          status?: string
          thread_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_a?: string
          profile_b?: string
          status?: string
          thread_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_matches_profile_a_fkey"
            columns: ["profile_a"]
            isOneToOne: false
            referencedRelation: "exchange_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_matches_profile_b_fkey"
            columns: ["profile_b"]
            isOneToOne: false
            referencedRelation: "exchange_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_matches_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_profiles: {
        Row: {
          created_at: string
          current_area: string | null
          current_area_sqm: number | null
          current_city: string
          current_contract_type: string
          current_floor: string | null
          current_has_accessibility: boolean
          current_has_balcony: boolean
          current_has_elevator: boolean
          current_landlord_name: string | null
          current_rent: number
          current_rooms: number
          current_street: string | null
          description: string | null
          id: string
          show_exact_address: boolean
          show_name_before_match: boolean
          status: string
          updated_at: string
          user_id: string
          wanted_areas: string[]
          wanted_cities: string[]
          wanted_max_rent: number | null
          wanted_min_area_sqm: number | null
          wanted_min_rooms: number | null
          wanted_needs_accessibility: boolean
        }
        Insert: {
          created_at?: string
          current_area?: string | null
          current_area_sqm?: number | null
          current_city: string
          current_contract_type?: string
          current_floor?: string | null
          current_has_accessibility?: boolean
          current_has_balcony?: boolean
          current_has_elevator?: boolean
          current_landlord_name?: string | null
          current_rent: number
          current_rooms: number
          current_street?: string | null
          description?: string | null
          id?: string
          show_exact_address?: boolean
          show_name_before_match?: boolean
          status?: string
          updated_at?: string
          user_id: string
          wanted_areas?: string[]
          wanted_cities?: string[]
          wanted_max_rent?: number | null
          wanted_min_area_sqm?: number | null
          wanted_min_rooms?: number | null
          wanted_needs_accessibility?: boolean
        }
        Update: {
          created_at?: string
          current_area?: string | null
          current_area_sqm?: number | null
          current_city?: string
          current_contract_type?: string
          current_floor?: string | null
          current_has_accessibility?: boolean
          current_has_balcony?: boolean
          current_has_elevator?: boolean
          current_landlord_name?: string | null
          current_rent?: number
          current_rooms?: number
          current_street?: string | null
          description?: string | null
          id?: string
          show_exact_address?: boolean
          show_name_before_match?: boolean
          status?: string
          updated_at?: string
          user_id?: string
          wanted_areas?: string[]
          wanted_cities?: string[]
          wanted_max_rent?: number | null
          wanted_min_area_sqm?: number | null
          wanted_min_rooms?: number | null
          wanted_needs_accessibility?: boolean
        }
        Relationships: []
      }
      exchange_reports: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          profile_id: string
          reason_type: string
          reporter_user_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          profile_id: string
          reason_type: string
          reporter_user_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          profile_id?: string
          reason_type?: string
          reporter_user_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "exchange_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      external_queue_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          membership_id: string
          payload: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          membership_id: string
          payload?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          membership_id?: string
          payload?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_queue_events_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "external_queue_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      external_queue_memberships: {
        Row: {
          city: string | null
          created_at: string
          current_days: number | null
          current_points: number | null
          custom_provider_name: string | null
          id: string
          joined_date: string | null
          last_updated_date: string | null
          login_url: string | null
          note: string | null
          provider_id: string | null
          renewal_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          current_days?: number | null
          current_points?: number | null
          custom_provider_name?: string | null
          id?: string
          joined_date?: string | null
          last_updated_date?: string | null
          login_url?: string | null
          note?: string | null
          provider_id?: string | null
          renewal_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          current_days?: number | null
          current_points?: number | null
          custom_provider_name?: string | null
          id?: string
          joined_date?: string | null
          last_updated_date?: string | null
          login_url?: string | null
          note?: string | null
          provider_id?: string | null
          renewal_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_queue_memberships_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "external_queue_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      external_queue_providers: {
        Row: {
          annual_fee_sek: number | null
          city: string | null
          created_at: string
          id: string
          is_active: boolean
          login_url: string | null
          name: string
          notes: string | null
          region: string | null
          renewal_rule: string | null
          signup_url: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          annual_fee_sek?: number | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          login_url?: string | null
          name: string
          notes?: string | null
          region?: string | null
          renewal_rule?: string | null
          signup_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          annual_fee_sek?: number | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          login_url?: string | null
          name?: string
          notes?: string | null
          region?: string | null
          renewal_rule?: string | null
          signup_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      external_queue_reminders: {
        Row: {
          created_at: string
          id: string
          membership_id: string
          remind_at: string
          reminder_type: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          membership_id: string
          remind_at: string
          reminder_type: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          membership_id?: string
          remind_at?: string
          reminder_type?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_queue_reminders_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "external_queue_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      guarantors: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          monthly_income: number | null
          note: string | null
          phone: string | null
          relationship: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          monthly_income?: number | null
          note?: string | null
          phone?: string | null
          relationship?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          monthly_income?: number | null
          note?: string | null
          phone?: string | null
          relationship?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      help_articles: {
        Row: {
          body: string
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      identity_verification_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          user_id: string
          verification_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          user_id: string
          verification_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          user_id?: string
          verification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "identity_verification_events_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "identity_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_verifications: {
        Row: {
          age_verified: boolean | null
          birth_date: string | null
          created_at: string
          failure_reason: string | null
          full_name_from_provider: string | null
          id: string
          metadata: Json
          personal_identity_number_hash: string | null
          provider: string
          provider_session_id: string | null
          status: Database["public"]["Enums"]["identity_verification_status"]
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          age_verified?: boolean | null
          birth_date?: string | null
          created_at?: string
          failure_reason?: string | null
          full_name_from_provider?: string | null
          id?: string
          metadata?: Json
          personal_identity_number_hash?: string | null
          provider: string
          provider_session_id?: string | null
          status?: Database["public"]["Enums"]["identity_verification_status"]
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          age_verified?: boolean | null
          birth_date?: string | null
          created_at?: string
          failure_reason?: string | null
          full_name_from_provider?: string | null
          id?: string
          metadata?: Json
          personal_identity_number_hash?: string | null
          provider?: string
          provider_session_id?: string | null
          status?: Database["public"]["Enums"]["identity_verification_status"]
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      landlord_policies: {
        Row: {
          company_id: string | null
          created_at: string
          current_version: number
          description: string | null
          id: string
          is_default: boolean
          name: string
          owner_user_id: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          current_version?: number
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          owner_user_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          current_version?: number
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          owner_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landlord_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_acceptances: {
        Row: {
          accepted_at: string
          document_type: string
          document_version: string
          id: string
          metadata: Json
          user_id: string
        }
        Insert: {
          accepted_at?: string
          document_type: string
          document_version: string
          id?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          accepted_at?: string
          document_type?: string
          document_version?: string
          id?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: []
      }
      listing_activity_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          listing_id: string
          message: string | null
          payload: Json
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          listing_id: string
          message?: string | null
          payload?: Json
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          listing_id?: string
          message?: string | null
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "listing_activity_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_url: string
          id: string
          listing_id: string
        }
        Insert: {
          created_at?: string
          document_type?: string
          file_name: string
          file_url: string
          id?: string
          listing_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_url?: string
          id?: string
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_documents_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_features: {
        Row: {
          created_at: string
          feature_key: string
          feature_label: string
          id: string
          listing_id: string
        }
        Insert: {
          created_at?: string
          feature_key: string
          feature_label: string
          id?: string
          listing_id: string
        }
        Update: {
          created_at?: string
          feature_key?: string
          feature_label?: string
          id?: string
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_features_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          image_url: string
          is_cover: boolean
          listing_id: string
          position: number
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_cover?: boolean
          listing_id: string
          position?: number
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_cover?: boolean
          listing_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_inquiries: {
        Row: {
          created_at: string
          id: string
          inquiry_type: Database["public"]["Enums"]["inquiry_type"]
          internal_note: string | null
          landlord_company_id: string | null
          landlord_user_id: string | null
          listing_city: string
          listing_id: string | null
          listing_price: number
          listing_segment: Database["public"]["Enums"]["listing_segment"]
          listing_slug: string
          listing_title: string
          listing_type: Database["public"]["Enums"]["listing_type"]
          message: string | null
          preferred_contact_method: string | null
          requester_company_name: string | null
          requester_email: string
          requester_full_name: string
          requester_phone: string | null
          status: Database["public"]["Enums"]["inquiry_status"]
          status_updated_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inquiry_type?: Database["public"]["Enums"]["inquiry_type"]
          internal_note?: string | null
          landlord_company_id?: string | null
          landlord_user_id?: string | null
          listing_city: string
          listing_id?: string | null
          listing_price?: number
          listing_segment: Database["public"]["Enums"]["listing_segment"]
          listing_slug: string
          listing_title: string
          listing_type: Database["public"]["Enums"]["listing_type"]
          message?: string | null
          preferred_contact_method?: string | null
          requester_company_name?: string | null
          requester_email: string
          requester_full_name: string
          requester_phone?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
          status_updated_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inquiry_type?: Database["public"]["Enums"]["inquiry_type"]
          internal_note?: string | null
          landlord_company_id?: string | null
          landlord_user_id?: string | null
          listing_city?: string
          listing_id?: string | null
          listing_price?: number
          listing_segment?: Database["public"]["Enums"]["listing_segment"]
          listing_slug?: string
          listing_title?: string
          listing_type?: Database["public"]["Enums"]["listing_type"]
          message?: string | null
          preferred_contact_method?: string | null
          requester_company_name?: string | null
          requester_email?: string
          requester_full_name?: string
          requester_phone?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
          status_updated_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_inquiries_landlord_company_id_fkey"
            columns: ["landlord_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_inquiries_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_internal_notes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          listing_id: string
          note: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          listing_id: string
          note: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          listing_id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_internal_notes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_policy_assignments: {
        Row: {
          created_at: string
          listing_id: string
          policy_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          policy_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          policy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_policy_assignments_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_policy_assignments_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "landlord_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_publications: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          listing_id: string
          note: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          listing_id: string
          note?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_publications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          access_24_7: boolean
          annual_income: number | null
          application_deadline: string | null
          area_name: string | null
          area_sqm: number | null
          available_from: string | null
          build_year: number | null
          business_purpose: string | null
          cap_rate: number | null
          city: string
          commercial_type: Database["public"]["Enums"]["commercial_type"] | null
          company_id: string | null
          country: string
          created_at: string
          created_by: string | null
          description: string | null
          floor: string | null
          has_accessibility: boolean
          has_balcony: boolean
          has_building_rights: boolean
          has_camera_surveillance: boolean
          has_detail_plan: boolean
          has_electricity: boolean
          has_elevator: boolean
          has_elevator_access: boolean
          has_ev_charger: boolean
          has_loading_zone: boolean
          has_parking: boolean
          has_reception: boolean
          has_road_access: boolean
          has_water_sewer: boolean
          hide_exact_address: boolean
          id: string
          investment_type: Database["public"]["Enums"]["investment_type"] | null
          is_furnished: boolean
          is_garage: boolean
          is_heated: boolean
          is_senior_housing: boolean
          is_short_term: boolean
          is_student_housing: boolean
          is_vat_applicable: boolean
          is_verified: boolean
          land_type: Database["public"]["Enums"]["land_type"] | null
          latitude: number | null
          listing_purpose: Database["public"]["Enums"]["listing_type"] | null
          listing_segment: Database["public"]["Enums"]["listing_segment"]
          listing_type: Database["public"]["Enums"]["listing_type"]
          longitude: number | null
          max_vehicle_height_cm: number | null
          meeting_rooms: number | null
          min_lease_months: number | null
          monthly_fee: number | null
          monthly_service_fee: number | null
          occupancy_rate: number | null
          operating_cost: number | null
          parking_type: Database["public"]["Enums"]["parking_type"] | null
          pets_allowed: boolean
          policy_summary: string | null
          price: number
          price_per_sqm: number | null
          property_type: Database["public"]["Enums"]["property_type"]
          published_at: string | null
          rooms: number | null
          scheduled_publish_at: string | null
          selection_method: string
          show_applicant_count: boolean
          slug: string
          status: Database["public"]["Enums"]["listing_status"]
          storage_type: Database["public"]["Enums"]["storage_type"] | null
          street: string | null
          title: string
          unit_id: string | null
          units_count: number | null
          updated_at: string
          vacancy_rate: number | null
          viewing_info: string | null
          workplaces: number | null
          zip_code: string | null
        }
        Insert: {
          access_24_7?: boolean
          annual_income?: number | null
          application_deadline?: string | null
          area_name?: string | null
          area_sqm?: number | null
          available_from?: string | null
          build_year?: number | null
          business_purpose?: string | null
          cap_rate?: number | null
          city: string
          commercial_type?:
            | Database["public"]["Enums"]["commercial_type"]
            | null
          company_id?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          floor?: string | null
          has_accessibility?: boolean
          has_balcony?: boolean
          has_building_rights?: boolean
          has_camera_surveillance?: boolean
          has_detail_plan?: boolean
          has_electricity?: boolean
          has_elevator?: boolean
          has_elevator_access?: boolean
          has_ev_charger?: boolean
          has_loading_zone?: boolean
          has_parking?: boolean
          has_reception?: boolean
          has_road_access?: boolean
          has_water_sewer?: boolean
          hide_exact_address?: boolean
          id?: string
          investment_type?:
            | Database["public"]["Enums"]["investment_type"]
            | null
          is_furnished?: boolean
          is_garage?: boolean
          is_heated?: boolean
          is_senior_housing?: boolean
          is_short_term?: boolean
          is_student_housing?: boolean
          is_vat_applicable?: boolean
          is_verified?: boolean
          land_type?: Database["public"]["Enums"]["land_type"] | null
          latitude?: number | null
          listing_purpose?: Database["public"]["Enums"]["listing_type"] | null
          listing_segment?: Database["public"]["Enums"]["listing_segment"]
          listing_type: Database["public"]["Enums"]["listing_type"]
          longitude?: number | null
          max_vehicle_height_cm?: number | null
          meeting_rooms?: number | null
          min_lease_months?: number | null
          monthly_fee?: number | null
          monthly_service_fee?: number | null
          occupancy_rate?: number | null
          operating_cost?: number | null
          parking_type?: Database["public"]["Enums"]["parking_type"] | null
          pets_allowed?: boolean
          policy_summary?: string | null
          price?: number
          price_per_sqm?: number | null
          property_type: Database["public"]["Enums"]["property_type"]
          published_at?: string | null
          rooms?: number | null
          scheduled_publish_at?: string | null
          selection_method?: string
          show_applicant_count?: boolean
          slug: string
          status?: Database["public"]["Enums"]["listing_status"]
          storage_type?: Database["public"]["Enums"]["storage_type"] | null
          street?: string | null
          title: string
          unit_id?: string | null
          units_count?: number | null
          updated_at?: string
          vacancy_rate?: number | null
          viewing_info?: string | null
          workplaces?: number | null
          zip_code?: string | null
        }
        Update: {
          access_24_7?: boolean
          annual_income?: number | null
          application_deadline?: string | null
          area_name?: string | null
          area_sqm?: number | null
          available_from?: string | null
          build_year?: number | null
          business_purpose?: string | null
          cap_rate?: number | null
          city?: string
          commercial_type?:
            | Database["public"]["Enums"]["commercial_type"]
            | null
          company_id?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          floor?: string | null
          has_accessibility?: boolean
          has_balcony?: boolean
          has_building_rights?: boolean
          has_camera_surveillance?: boolean
          has_detail_plan?: boolean
          has_electricity?: boolean
          has_elevator?: boolean
          has_elevator_access?: boolean
          has_ev_charger?: boolean
          has_loading_zone?: boolean
          has_parking?: boolean
          has_reception?: boolean
          has_road_access?: boolean
          has_water_sewer?: boolean
          hide_exact_address?: boolean
          id?: string
          investment_type?:
            | Database["public"]["Enums"]["investment_type"]
            | null
          is_furnished?: boolean
          is_garage?: boolean
          is_heated?: boolean
          is_senior_housing?: boolean
          is_short_term?: boolean
          is_student_housing?: boolean
          is_vat_applicable?: boolean
          is_verified?: boolean
          land_type?: Database["public"]["Enums"]["land_type"] | null
          latitude?: number | null
          listing_purpose?: Database["public"]["Enums"]["listing_type"] | null
          listing_segment?: Database["public"]["Enums"]["listing_segment"]
          listing_type?: Database["public"]["Enums"]["listing_type"]
          longitude?: number | null
          max_vehicle_height_cm?: number | null
          meeting_rooms?: number | null
          min_lease_months?: number | null
          monthly_fee?: number | null
          monthly_service_fee?: number | null
          occupancy_rate?: number | null
          operating_cost?: number | null
          parking_type?: Database["public"]["Enums"]["parking_type"] | null
          pets_allowed?: boolean
          policy_summary?: string | null
          price?: number
          price_per_sqm?: number | null
          property_type?: Database["public"]["Enums"]["property_type"]
          published_at?: string | null
          rooms?: number | null
          scheduled_publish_at?: string | null
          selection_method?: string
          show_applicant_count?: boolean
          slug?: string
          status?: Database["public"]["Enums"]["listing_status"]
          storage_type?: Database["public"]["Enums"]["storage_type"] | null
          street?: string | null
          title?: string
          unit_id?: string | null
          units_count?: number | null
          updated_at?: string
          vacancy_rate?: number | null
          viewing_info?: string | null
          workplaces?: number | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          file_name: string
          file_url: string
          id: string
          message_id: string
          size_bytes: number | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          message_id: string
          size_bytes?: number | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          message_id?: string
          size_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          payload: Json
          thread_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          thread_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_events_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      message_participants: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          last_read_at: string | null
          participant_role: string
          thread_id: string
          unread_reminded_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          last_read_at?: string | null
          participant_role?: string
          thread_id: string
          unread_reminded_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          last_read_at?: string | null
          participant_role?: string
          thread_id?: string
          unread_reminded_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          application_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          last_message_at: string
          listing_id: string | null
          locked_at: string | null
          locked_by: string | null
          response_deadline_at: string | null
          subject: string
          thread_type: string
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_message_at?: string
          listing_id?: string | null
          locked_at?: string | null
          locked_by?: string | null
          response_deadline_at?: string | null
          subject: string
          thread_type?: string
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_message_at?: string
          listing_id?: string | null
          locked_at?: string | null
          locked_by?: string | null
          response_deadline_at?: string | null
          subject?: string
          thread_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "rental_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_user_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_user_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_user_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_items: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string
          error: string | null
          id: string
          project_id: string
          row_number: number
          run_id: string | null
          source_row: Json
          status: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type: string
          error?: string | null
          id?: string
          project_id: string
          row_number: number
          run_id?: string | null
          source_row?: Json
          status?: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          error?: string | null
          id?: string
          project_id?: string
          row_number?: number
          run_id?: string | null
          source_row?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "migration_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "migration_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "migration_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "migration_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_projects: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          headers: Json
          id: string
          mapping: Json
          name: string
          owner_user_id: string | null
          raw_csv: string
          source_label: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          headers?: Json
          id?: string
          mapping?: Json
          name: string
          owner_user_id?: string | null
          raw_csv: string
          source_label?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          headers?: Json
          id?: string
          mapping?: Json
          name?: string
          owner_user_id?: string | null
          raw_csv?: string
          source_label?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "migration_projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_runs: {
        Row: {
          created_at: string
          created_by: string | null
          error: string | null
          finished_at: string | null
          id: string
          project_id: string
          run_type: string
          stats: Json
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          project_id: string
          run_type: string
          stats?: Json
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          project_id?: string
          run_type?: string
          stats?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "migration_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "migration_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email_applications: boolean
          email_byta: boolean
          email_marketing: boolean
          email_messages: boolean
          email_queue: boolean
          email_saved_searches: boolean
          updated_at: string
          user_id: string
          weekly_digest: boolean
        }
        Insert: {
          email_applications?: boolean
          email_byta?: boolean
          email_marketing?: boolean
          email_messages?: boolean
          email_queue?: boolean
          email_saved_searches?: boolean
          updated_at?: string
          user_id: string
          weekly_digest?: boolean
        }
        Update: {
          email_applications?: boolean
          email_byta?: boolean
          email_marketing?: boolean
          email_messages?: boolean
          email_queue?: boolean
          email_saved_searches?: boolean
          updated_at?: string
          user_id?: string
          weekly_digest?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          description: string | null
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      policy_evaluations: {
        Row: {
          context: string
          created_at: string
          id: string
          listing_id: string
          outcomes: Json
          policy_id: string | null
          policy_version: number | null
          result: string
          user_id: string
        }
        Insert: {
          context?: string
          created_at?: string
          id?: string
          listing_id: string
          outcomes?: Json
          policy_id?: string | null
          policy_version?: number | null
          result: string
          user_id: string
        }
        Update: {
          context?: string
          created_at?: string
          id?: string
          listing_id?: string
          outcomes?: Json
          policy_id?: string | null
          policy_version?: number | null
          result?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_evaluations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_evaluations_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "landlord_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_rules: {
        Row: {
          config: Json
          created_at: string
          id: string
          policy_id: string
          rule_type: string
          version: number
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          policy_id: string
          rule_type: string
          version?: number
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          policy_id?: string
          rule_type?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "policy_rules_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "landlord_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_requests: {
        Row: {
          created_at: string
          handled_at: string | null
          handled_by: string | null
          id: string
          message: string | null
          request_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          message?: string | null
          request_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          message?: string | null
          request_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_documents: {
        Row: {
          created_at: string
          document_expires_at: string | null
          document_status: string
          document_type: string
          file_name: string
          file_url: string
          id: string
          is_default_for_applications: boolean
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_expires_at?: string | null
          document_status?: string
          document_type?: string
          file_name: string
          file_url: string
          id?: string
          is_default_for_applications?: boolean
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_expires_at?: string | null
          document_status?: string
          document_type?: string
          file_name?: string
          file_url?: string
          id?: string
          is_default_for_applications?: boolean
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string
          avatar_url: string | null
          city: string | null
          created_at: string
          current_housing_situation: string | null
          desired_locations: string[] | null
          desired_move_in: string | null
          employer_name: string | null
          employment_status: string | null
          first_name: string | null
          guarantor_available: boolean
          has_pets: boolean
          household_size: number | null
          id: string
          identity_verified_at: string | null
          income_type: string | null
          last_name: string | null
          marketing_consent: boolean
          monthly_income: number | null
          onboarding_completed: boolean
          personal_identity_consent_at: string | null
          personal_identity_number: string | null
          personal_letter: string | null
          phone: string | null
          phone_verified_at: string | null
          preferred_listing_intent: string
          privacy_accepted_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          smoking: boolean
          study_status: string | null
          terms_accepted_at: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          current_housing_situation?: string | null
          desired_locations?: string[] | null
          desired_move_in?: string | null
          employer_name?: string | null
          employment_status?: string | null
          first_name?: string | null
          guarantor_available?: boolean
          has_pets?: boolean
          household_size?: number | null
          id: string
          identity_verified_at?: string | null
          income_type?: string | null
          last_name?: string | null
          marketing_consent?: boolean
          monthly_income?: number | null
          onboarding_completed?: boolean
          personal_identity_consent_at?: string | null
          personal_identity_number?: string | null
          personal_letter?: string | null
          phone?: string | null
          phone_verified_at?: string | null
          preferred_listing_intent?: string
          privacy_accepted_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          smoking?: boolean
          study_status?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          current_housing_situation?: string | null
          desired_locations?: string[] | null
          desired_move_in?: string | null
          employer_name?: string | null
          employment_status?: string | null
          first_name?: string | null
          guarantor_available?: boolean
          has_pets?: boolean
          household_size?: number | null
          id?: string
          identity_verified_at?: string | null
          income_type?: string | null
          last_name?: string | null
          marketing_consent?: boolean
          monthly_income?: number | null
          onboarding_completed?: boolean
          personal_identity_consent_at?: string | null
          personal_identity_number?: string | null
          personal_letter?: string | null
          phone?: string | null
          phone_verified_at?: string | null
          preferred_listing_intent?: string
          privacy_accepted_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          smoking?: boolean
          study_status?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          area_name: string | null
          city: string
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          owner_user_id: string | null
          street: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          area_name?: string | null
          city: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_user_id?: string | null
          street?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          area_name?: string | null
          city?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_user_id?: string | null
          street?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          disabled_at: string | null
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
          disabled_at?: string | null
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
          disabled_at?: string | null
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      queue_memberships: {
        Row: {
          created_at: string
          current_points: number
          id: string
          joined_queue_at: string | null
          last_point_awarded_at: string | null
          membership_status: Database["public"]["Enums"]["queue_membership_status"]
          months_in_queue: number
          next_billing_at: string | null
          points_reset_at: string | null
          queue_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_points?: number
          id?: string
          joined_queue_at?: string | null
          last_point_awarded_at?: string | null
          membership_status?: Database["public"]["Enums"]["queue_membership_status"]
          months_in_queue?: number
          next_billing_at?: string | null
          points_reset_at?: string | null
          queue_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_points?: number
          id?: string
          joined_queue_at?: string | null
          last_point_awarded_at?: string | null
          membership_status?: Database["public"]["Enums"]["queue_membership_status"]
          months_in_queue?: number
          next_billing_at?: string | null
          points_reset_at?: string | null
          queue_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      queue_point_ledger: {
        Row: {
          balance_after: number
          created_at: string
          event_type: Database["public"]["Enums"]["queue_point_event_type"]
          id: string
          membership_id: string
          note: string | null
          points_delta: number
          user_id: string
        }
        Insert: {
          balance_after?: number
          created_at?: string
          event_type: Database["public"]["Enums"]["queue_point_event_type"]
          id?: string
          membership_id: string
          note?: string | null
          points_delta?: number
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          event_type?: Database["public"]["Enums"]["queue_point_event_type"]
          id?: string
          membership_id?: string
          note?: string | null
          points_delta?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_point_ledger_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "queue_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_events: {
        Row: {
          created_at: string
          id: string
          ip_hash: string | null
          scope: string
          subject_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          scope: string
          subject_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          scope?: string
          subject_hash?: string
        }
        Relationships: []
      }
      rental_application_co_applicants: {
        Row: {
          application_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          relationship: string | null
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          relationship?: string | null
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          relationship?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_application_co_applicants_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "rental_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_application_documents: {
        Row: {
          application_id: string
          created_at: string
          document_type: string
          file_name: string
          file_url: string
          id: string
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          document_type: string
          file_name: string
          file_url: string
          id?: string
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          document_type?: string
          file_name?: string
          file_url?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_application_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "rental_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_application_status_history: {
        Row: {
          actor_user_id: string | null
          application_id: string
          created_at: string
          from_status:
            | Database["public"]["Enums"]["rental_application_status"]
            | null
          id: string
          note: string | null
          to_status: Database["public"]["Enums"]["rental_application_status"]
        }
        Insert: {
          actor_user_id?: string | null
          application_id: string
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["rental_application_status"]
            | null
          id?: string
          note?: string | null
          to_status: Database["public"]["Enums"]["rental_application_status"]
        }
        Update: {
          actor_user_id?: string | null
          application_id?: string
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["rental_application_status"]
            | null
          id?: string
          note?: string | null
          to_status?: Database["public"]["Enums"]["rental_application_status"]
        }
        Relationships: [
          {
            foreignKeyName: "rental_application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "rental_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_applications: {
        Row: {
          applicant_email: string | null
          applicant_full_name: string | null
          applicant_household_size: number | null
          applicant_monthly_income: number | null
          applicant_phone: string | null
          applicant_snapshot: Json | null
          applicant_user_id: string | null
          cover_letter: string | null
          created_at: string
          desired_move_in: string | null
          employer_name: string | null
          employment_status: string | null
          employment_type: string | null
          has_pets: boolean | null
          household_size: number | null
          id: string
          internal_note: string | null
          landlord_company_id: string | null
          landlord_user_id: string | null
          listing_city: string | null
          listing_id: string
          listing_image_url: string | null
          listing_price: number
          listing_slug: string | null
          listing_title: string | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          message: string | null
          monthly_income: number | null
          move_in_date: string | null
          pets: boolean
          queue_joined_at_snapshot: string | null
          queue_points_snapshot: number
          random_rank: number | null
          rejection_reason: string | null
          smoking: boolean
          status: Database["public"]["Enums"]["rental_application_status"]
          status_updated_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          applicant_email?: string | null
          applicant_full_name?: string | null
          applicant_household_size?: number | null
          applicant_monthly_income?: number | null
          applicant_phone?: string | null
          applicant_snapshot?: Json | null
          applicant_user_id?: string | null
          cover_letter?: string | null
          created_at?: string
          desired_move_in?: string | null
          employer_name?: string | null
          employment_status?: string | null
          employment_type?: string | null
          has_pets?: boolean | null
          household_size?: number | null
          id?: string
          internal_note?: string | null
          landlord_company_id?: string | null
          landlord_user_id?: string | null
          listing_city?: string | null
          listing_id: string
          listing_image_url?: string | null
          listing_price?: number
          listing_slug?: string | null
          listing_title?: string | null
          listing_type?: Database["public"]["Enums"]["listing_type"]
          message?: string | null
          monthly_income?: number | null
          move_in_date?: string | null
          pets?: boolean
          queue_joined_at_snapshot?: string | null
          queue_points_snapshot?: number
          random_rank?: number | null
          rejection_reason?: string | null
          smoking?: boolean
          status?: Database["public"]["Enums"]["rental_application_status"]
          status_updated_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          applicant_email?: string | null
          applicant_full_name?: string | null
          applicant_household_size?: number | null
          applicant_monthly_income?: number | null
          applicant_phone?: string | null
          applicant_snapshot?: Json | null
          applicant_user_id?: string | null
          cover_letter?: string | null
          created_at?: string
          desired_move_in?: string | null
          employer_name?: string | null
          employment_status?: string | null
          employment_type?: string | null
          has_pets?: boolean | null
          household_size?: number | null
          id?: string
          internal_note?: string | null
          landlord_company_id?: string | null
          landlord_user_id?: string | null
          listing_city?: string | null
          listing_id?: string
          listing_image_url?: string | null
          listing_price?: number
          listing_slug?: string | null
          listing_title?: string | null
          listing_type?: Database["public"]["Enums"]["listing_type"]
          message?: string | null
          monthly_income?: number | null
          move_in_date?: string | null
          pets?: boolean
          queue_joined_at_snapshot?: string | null
          queue_points_snapshot?: number
          random_rank?: number | null
          rejection_reason?: string | null
          smoking?: boolean
          status?: Database["public"]["Enums"]["rental_application_status"]
          status_updated_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_applications_landlord_company_id_fkey"
            columns: ["landlord_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_offer_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          offer_id: string
          payload: Json
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          offer_id: string
          payload?: Json
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          offer_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "rental_offer_events_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "rental_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_offers: {
        Row: {
          application_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          listing_id: string | null
          message: string | null
          responded_at: string | null
          status: string
          user_id: string
          withdrawn_reason: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          listing_id?: string | null
          message?: string | null
          responded_at?: string | null
          status?: string
          user_id: string
          withdrawn_reason?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          listing_id?: string | null
          message?: string | null
          responded_at?: string | null
          status?: string
          user_id?: string
          withdrawn_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_offers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "rental_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_requirements: {
        Row: {
          created_at: string
          employment_required: boolean
          listing_id: string
          min_income: number | null
          pets_allowed: boolean
          references_required: boolean
          smoking_allowed: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          employment_required?: boolean
          listing_id: string
          min_income?: number | null
          pets_allowed?: boolean
          references_required?: boolean
          smoking_allowed?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          employment_required?: boolean
          listing_id?: string
          min_income?: number | null
          pets_allowed?: boolean
          references_required?: boolean
          smoking_allowed?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_requirements_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_leads: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          listing_id: string
          message: string | null
          phone: string | null
          status: Database["public"]["Enums"]["sale_lead_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          listing_id: string
          message?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["sale_lead_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          listing_id?: string
          message?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["sale_lead_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_leads: {
        Row: {
          assigned_to: string | null
          city: string | null
          company_name: string
          contact_name: string
          created_at: string
          email: string
          id: string
          internal_note: string | null
          message: string | null
          phone: string | null
          roi_snapshot: Json | null
          source: string
          status: string
          units_count: number | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          city?: string | null
          company_name: string
          contact_name: string
          created_at?: string
          email: string
          id?: string
          internal_note?: string | null
          message?: string | null
          phone?: string | null
          roi_snapshot?: Json | null
          source?: string
          status?: string
          units_count?: number | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          city?: string | null
          company_name?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          internal_note?: string | null
          message?: string | null
          phone?: string | null
          roi_snapshot?: Json | null
          source?: string
          status?: string
          units_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      saved_search_matches: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          notified_at: string | null
          saved_search_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          notified_at?: string | null
          saved_search_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          notified_at?: string | null
          saved_search_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_search_matches_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_search_matches_saved_search_id_fkey"
            columns: ["saved_search_id"]
            isOneToOne: false
            referencedRelation: "saved_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_search_notification_runs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          matched_listing_ids: string[]
          saved_search_id: string | null
          sent_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          matched_listing_ids?: string[]
          saved_search_id?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          matched_listing_ids?: string[]
          saved_search_id?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_search_notification_runs_saved_search_id_fkey"
            columns: ["saved_search_id"]
            isOneToOne: false
            referencedRelation: "saved_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          city: string | null
          created_at: string
          id: string
          max_price: number | null
          min_rooms: number | null
          mode: Database["public"]["Enums"]["saved_search_mode"]
          notifications_enabled: boolean
          property_type: Database["public"]["Enums"]["property_type"] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          max_price?: number | null
          min_rooms?: number | null
          mode?: Database["public"]["Enums"]["saved_search_mode"]
          notifications_enabled?: boolean
          property_type?: Database["public"]["Enums"]["property_type"] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          max_price?: number | null
          min_rooms?: number | null
          mode?: Database["public"]["Enums"]["saved_search_mode"]
          notifications_enabled?: boolean
          property_type?: Database["public"]["Enums"]["property_type"] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          amount_sek: number
          code: string
          created_at: string
          description: string | null
          features: Json
          id: string
          interval_unit: string
          is_active: boolean
          is_public: boolean
          max_active_applications: number | null
          name: string
          plan_audience: string
          stripe_price_id: string | null
          trial_days: number | null
          updated_at: string
        }
        Insert: {
          amount_sek: number
          code: string
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          interval_unit?: string
          is_active?: boolean
          is_public?: boolean
          max_active_applications?: number | null
          name: string
          plan_audience?: string
          stripe_price_id?: string | null
          trial_days?: number | null
          updated_at?: string
        }
        Update: {
          amount_sek?: number
          code?: string
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          interval_unit?: string
          is_active?: boolean
          is_public?: boolean
          max_active_applications?: number | null
          name?: string
          plan_audience?: string
          stripe_price_id?: string | null
          trial_days?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      support_access_grants: {
        Row: {
          admin_user_id: string
          created_at: string
          expires_at: string
          id: string
          reason: string
          revoked_at: string | null
          revoked_by: string | null
          thread_id: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          expires_at: string
          id?: string
          reason: string
          revoked_at?: string | null
          revoked_by?: string | null
          thread_id: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          reason?: string
          revoked_at?: string | null
          revoked_by?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_access_grants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      support_macros: {
        Row: {
          body: string
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          title: string
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          title: string
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          title?: string
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_staff: boolean
          sender_user_id: string | null
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_staff?: boolean
          sender_user_id?: string | null
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_staff?: boolean
          sender_user_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          first_response_at: string | null
          id: string
          priority: string
          resolved_at: string | null
          sla_due_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          first_response_at?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          sla_due_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          first_response_at?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          sla_due_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tenant_portals: {
        Row: {
          cities: string[]
          company_id: string
          contact_email: string | null
          created_at: string
          created_by: string | null
          custom_domain: string | null
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          primary_color: string
          show_queue_info: boolean
          slug: string
          tagline: string | null
          updated_at: string
        }
        Insert: {
          cities?: string[]
          company_id: string
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          custom_domain?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          primary_color?: string
          show_queue_info?: boolean
          slug: string
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          cities?: string[]
          company_id?: string
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          custom_domain?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          primary_color?: string
          show_queue_info?: boolean
          slug?: string
          tagline?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_portals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_url: string
          id: string
          unit_id: string
        }
        Insert: {
          created_at?: string
          document_type?: string
          file_name: string
          file_url: string
          id?: string
          unit_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_url?: string
          id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_documents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_media: {
        Row: {
          created_at: string
          id: string
          media_type: string
          media_url: string
          position: number
          unit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_type?: string
          media_url: string
          position?: number
          unit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string
          media_url?: string
          position?: number
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_media_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          area_sqm: number | null
          base_rent: number | null
          building_id: string | null
          created_at: string
          floor: string | null
          has_accessibility: boolean
          has_balcony: boolean
          id: string
          note: string | null
          property_id: string
          rooms: number | null
          status: string
          unit_number: string
          updated_at: string
        }
        Insert: {
          area_sqm?: number | null
          base_rent?: number | null
          building_id?: string | null
          created_at?: string
          floor?: string | null
          has_accessibility?: boolean
          has_balcony?: boolean
          id?: string
          note?: string | null
          property_id: string
          rooms?: number | null
          status?: string
          unit_number: string
          updated_at?: string
        }
        Update: {
          area_sqm?: number | null
          base_rent?: number | null
          building_id?: string | null
          created_at?: string
          floor?: string | null
          has_accessibility?: boolean
          has_balcony?: boolean
          id?: string
          note?: string | null
          property_id?: string
          rooms?: number | null
          status?: string
          unit_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          consent_type: string
          consent_version: string
          granted: boolean
          granted_at: string
          id: string
          metadata: Json
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          consent_type: string
          consent_version: string
          granted?: boolean
          granted_at?: string
          id?: string
          metadata?: Json
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          consent_type?: string
          consent_version?: string
          granted?: boolean
          granted_at?: string
          id?: string
          metadata?: Json
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_risk_flags: {
        Row: {
          created_at: string
          created_by: string | null
          flag_type: string
          id: string
          metadata: Json
          note: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          flag_type: string
          id?: string
          metadata?: Json
          note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          flag_type?: string
          id?: string
          metadata?: Json
          note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_code: string
          provider: string
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_code: string
          provider?: string
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_code?: string
          provider?: string
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["code"]
          },
        ]
      }
      viewing_invitations: {
        Row: {
          application_id: string
          created_at: string
          id: string
          responded_at: string | null
          slot_id: string
          status: string
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          responded_at?: string | null
          slot_id: string
          status?: string
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          responded_at?: string | null
          slot_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viewing_invitations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "rental_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewing_invitations_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "viewing_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      viewing_slots: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          listing_id: string
          location_note: string | null
          max_attendees: number | null
          starts_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          listing_id: string
          location_note?: string | null
          max_attendees?: number | null
          starts_at: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          listing_id?: string
          location_note?: string | null
          max_attendees?: number | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "viewing_slots_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      viewings: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          listing_id: string
          location_note: string | null
          rental_application_id: string | null
          sale_lead_id: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["viewing_status"]
          updated_at: string
          viewing_type: Database["public"]["Enums"]["viewing_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          listing_id: string
          location_note?: string | null
          rental_application_id?: string | null
          sale_lead_id?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["viewing_status"]
          updated_at?: string
          viewing_type: Database["public"]["Enums"]["viewing_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          listing_id?: string
          location_note?: string | null
          rental_application_id?: string | null
          sale_lead_id?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["viewing_status"]
          updated_at?: string
          viewing_type?: Database["public"]["Enums"]["viewing_type"]
        }
        Relationships: [
          {
            foreignKeyName: "viewings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewings_rental_application_id_fkey"
            columns: ["rental_application_id"]
            isOneToOne: false
            referencedRelation: "rental_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewings_sale_lead_id_fkey"
            columns: ["sale_lead_id"]
            isOneToOne: false
            referencedRelation: "sale_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempts: number
          created_at: string
          delivered_at: string | null
          endpoint_id: string
          event_type: string
          id: string
          last_error: string | null
          next_attempt_at: string
          payload: Json
          response_status: number | null
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          endpoint_id: string
          event_type: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          response_status?: number | null
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          endpoint_id?: string
          event_type?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          response_status?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          events: string[]
          failure_count: number
          id: string
          is_active: boolean
          last_failure_at: string | null
          last_success_at: string | null
          owner_user_id: string | null
          secret: string
          url: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          events?: string[]
          failure_count?: number
          id?: string
          is_active?: boolean
          last_failure_at?: string | null
          last_success_at?: string | null
          owner_user_id?: string | null
          secret: string
          url: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          events?: string[]
          failure_count?: number
          id?: string
          is_active?: boolean
          last_failure_at?: string | null
          last_success_at?: string | null
          owner_user_id?: string | null
          secret?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_company_invite: { Args: { p_token: string }; Returns: Json }
      admin_adjust_queue_points: {
        Args: {
          p_delta: number
          p_joined_at?: string
          p_note: string
          p_user_id: string
        }
        Returns: Json
      }
      admin_identity_overview: {
        Args: never
        Returns: {
          age_verified: boolean
          created_at: string
          failure_reason: string
          id: string
          provider: string
          status: Database["public"]["Enums"]["identity_verification_status"]
          user_id: string
          verified_at: string
        }[]
      }
      admin_queue_overview: {
        Args: never
        Returns: {
          current_points: number
          joined_queue_at: string
          membership_id: string
          membership_status: Database["public"]["Enums"]["queue_membership_status"]
          points_reset_at: string
          queue_type: string
          user_id: string
        }[]
      }
      admin_recent_message_threads: {
        Args: { p_limit?: number }
        Returns: {
          application_id: string
          company_id: string
          created_at: string
          id: string
          last_message_at: string
          listing_id: string
          message_count: number
          participant_count: number
          subject: string
          thread_type: string
        }[]
      }
      admin_set_queue_status: {
        Args: {
          p_note: string
          p_status: Database["public"]["Enums"]["queue_membership_status"]
          p_user_id: string
        }
        Returns: Json
      }
      admin_user_overview: {
        Args: never
        Returns: {
          account_type: string
          city: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      award_queue_points_daily: { Args: never; Returns: Json }
      check_rate_limit: {
        Args: {
          input_ip_hash: string
          input_limit: number
          input_scope: string
          input_subject_hash: string
          input_window_seconds: number
        }
        Returns: boolean
      }
      create_application_thread: {
        Args: { p_application_id: string; p_body: string; p_subject: string }
        Returns: string
      }
      current_user_can_manage_application: {
        Args: { target_application_id: string }
        Returns: boolean
      }
      current_user_can_manage_company: {
        Args: { target_company_id: string }
        Returns: boolean
      }
      current_user_can_manage_inquiry: {
        Args: { target_inquiry_id: string }
        Returns: boolean
      }
      current_user_can_manage_listing: {
        Args: { target_listing_id: string }
        Returns: boolean
      }
      current_user_can_manage_property: {
        Args: { target_property_id: string }
        Returns: boolean
      }
      current_user_company_ids: { Args: never; Returns: string[] }
      current_user_has_support_access: {
        Args: { target_thread_id: string }
        Returns: boolean
      }
      current_user_is_admin: { Args: never; Returns: boolean }
      current_user_is_company_manager: {
        Args: { target_company_id: string }
        Returns: boolean
      }
      current_user_is_identity_verified: { Args: never; Returns: boolean }
      current_user_is_super_admin: { Args: never; Returns: boolean }
      current_user_is_thread_participant: {
        Args: { target_thread_id: string }
        Returns: boolean
      }
      current_user_owns_api_resource: {
        Args: { target_company_id: string; target_owner_user_id: string }
        Returns: boolean
      }
      current_user_owns_migration_project: {
        Args: { target_project_id: string }
        Returns: boolean
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      enqueue_webhook_event: {
        Args: {
          p_company_id: string
          p_event_type: string
          p_owner_user_id: string
          p_payload: Json
        }
        Returns: number
      }
      estimated_queue_position: {
        Args: { p_listing_id: string }
        Returns: Json
      }
      finalize_identity_verification: {
        Args: {
          p_age_verified?: boolean
          p_birth_date?: string
          p_failure_reason?: string
          p_full_name?: string
          p_metadata?: Json
          p_pin_hash?: string
          p_status: Database["public"]["Enums"]["identity_verification_status"]
          p_verification_id: string
        }
        Returns: Json
      }
      finalize_signed_contract: {
        Args: { p_contract_id: string }
        Returns: Json
      }
      get_co_applicant_invite: {
        Args: { p_token: string }
        Returns: {
          full_name: string
          id: string
          invite_status: string
          inviter_name: string
          relationship: string
        }[]
      }
      get_company_invite: {
        Args: { p_token: string }
        Returns: {
          company_name: string
          id: string
          team_role: string
        }[]
      }
      get_event_type_counts: {
        Args: { p_since: string }
        Returns: {
          event_type: string
          events: number
        }[]
      }
      get_listing_view_counts: {
        Args: { p_listing_ids: string[]; p_since: string }
        Returns: {
          listing_id: string
          views: number
        }[]
      }
      household_queue_points: {
        Args: never
        Returns: {
          points: number
          user_id: string
        }[]
      }
      mock_sign_contract: { Args: { p_contract_id: string }; Returns: Json }
      notify_application_applicant: {
        Args: { p_application_id: string; p_body: string; p_title: string }
        Returns: undefined
      }
      public_listing_applicant_count: {
        Args: { p_listing_id: string }
        Returns: number
      }
      register_exchange_interest: {
        Args: { p_interested: boolean; p_to_profile_id: string }
        Returns: Json
      }
      reset_queue_points: {
        Args: { p_reason: string; p_user_id: string }
        Returns: Json
      }
      respond_co_applicant_invite: {
        Args: { p_accept: boolean; p_token: string }
        Returns: Json
      }
      storage_bucket_exists: { Args: { bucket_name: string }; Returns: boolean }
      track_analytics_event: {
        Args: { p_event_type: string; p_listing_id?: string; p_metadata?: Json }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "seeker"
        | "buyer"
        | "landlord"
        | "broker"
        | "company_admin"
        | "admin"
        | "super_admin"
      commercial_type:
        | "office"
        | "retail"
        | "restaurant"
        | "warehouse"
        | "industrial"
        | "showroom"
        | "clinic"
        | "workshop"
        | "other"
      identity_verification_status:
        | "pending"
        | "verified"
        | "failed"
        | "expired"
        | "cancelled"
      inquiry_status:
        | "new"
        | "contacted"
        | "viewing_booked"
        | "negotiating"
        | "closed"
        | "rejected"
      inquiry_type: "interest" | "viewing" | "offer_request" | "contact"
      investment_type:
        | "rental_property"
        | "commercial_property"
        | "mixed_use_property"
        | "portfolio"
        | "project_property"
        | "other"
      land_type:
        | "land_plot"
        | "industrial_land"
        | "agricultural_land"
        | "development_land"
        | "yard_space"
        | "other"
      listing_segment:
        | "residential"
        | "commercial"
        | "parking"
        | "storage"
        | "land"
        | "investment"
      listing_status:
        | "draft"
        | "published"
        | "paused"
        | "rented"
        | "sold"
        | "archived"
      listing_type: "rent" | "sale"
      parking_type:
        | "outdoor"
        | "garage"
        | "ev_charging"
        | "motorcycle"
        | "truck"
        | "other"
      property_type:
        | "apartment"
        | "house"
        | "property"
        | "commercial_space"
        | "office"
        | "parking_space"
        | "garage"
        | "storage_unit"
        | "land_plot"
        | "investment_property"
      queue_membership_status:
        | "inactive"
        | "active"
        | "paused"
        | "cancelled"
        | "expired"
      queue_point_event_type:
        | "enrolled"
        | "monthly_accrual"
        | "manual_adjustment"
        | "paused"
        | "resumed"
        | "cancelled"
        | "daily_accrual"
        | "reset"
      rental_application_status:
        | "draft"
        | "submitted"
        | "received"
        | "reviewing"
        | "qualified"
        | "reserve"
        | "viewing"
        | "offered"
        | "rejected"
        | "signed"
        | "shortlisted"
        | "withdrawn"
        | "screening"
        | "not_qualified"
        | "viewing_invited"
        | "viewing_booked"
        | "offer_accepted"
        | "contract_pending"
        | "expired"
        | "rented_to_other"
      sale_lead_status:
        | "new"
        | "contacted"
        | "viewing_booked"
        | "follow_up"
        | "closed"
      saved_search_mode: "rent" | "sale" | "all"
      storage_type:
        | "storage_unit"
        | "warehouse_box"
        | "mini_warehouse"
        | "pallet_space"
        | "container"
        | "other"
      subscription_status:
        | "pending"
        | "active"
        | "paused"
        | "past_due"
        | "cancelled"
        | "expired"
      viewing_status: "scheduled" | "confirmed" | "completed" | "cancelled"
      viewing_type: "rental" | "sale"
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
        "seeker",
        "buyer",
        "landlord",
        "broker",
        "company_admin",
        "admin",
        "super_admin",
      ],
      commercial_type: [
        "office",
        "retail",
        "restaurant",
        "warehouse",
        "industrial",
        "showroom",
        "clinic",
        "workshop",
        "other",
      ],
      identity_verification_status: [
        "pending",
        "verified",
        "failed",
        "expired",
        "cancelled",
      ],
      inquiry_status: [
        "new",
        "contacted",
        "viewing_booked",
        "negotiating",
        "closed",
        "rejected",
      ],
      inquiry_type: ["interest", "viewing", "offer_request", "contact"],
      investment_type: [
        "rental_property",
        "commercial_property",
        "mixed_use_property",
        "portfolio",
        "project_property",
        "other",
      ],
      land_type: [
        "land_plot",
        "industrial_land",
        "agricultural_land",
        "development_land",
        "yard_space",
        "other",
      ],
      listing_segment: [
        "residential",
        "commercial",
        "parking",
        "storage",
        "land",
        "investment",
      ],
      listing_status: [
        "draft",
        "published",
        "paused",
        "rented",
        "sold",
        "archived",
      ],
      listing_type: ["rent", "sale"],
      parking_type: [
        "outdoor",
        "garage",
        "ev_charging",
        "motorcycle",
        "truck",
        "other",
      ],
      property_type: [
        "apartment",
        "house",
        "property",
        "commercial_space",
        "office",
        "parking_space",
        "garage",
        "storage_unit",
        "land_plot",
        "investment_property",
      ],
      queue_membership_status: [
        "inactive",
        "active",
        "paused",
        "cancelled",
        "expired",
      ],
      queue_point_event_type: [
        "enrolled",
        "monthly_accrual",
        "manual_adjustment",
        "paused",
        "resumed",
        "cancelled",
        "daily_accrual",
        "reset",
      ],
      rental_application_status: [
        "draft",
        "submitted",
        "received",
        "reviewing",
        "qualified",
        "reserve",
        "viewing",
        "offered",
        "rejected",
        "signed",
        "shortlisted",
        "withdrawn",
        "screening",
        "not_qualified",
        "viewing_invited",
        "viewing_booked",
        "offer_accepted",
        "contract_pending",
        "expired",
        "rented_to_other",
      ],
      sale_lead_status: [
        "new",
        "contacted",
        "viewing_booked",
        "follow_up",
        "closed",
      ],
      saved_search_mode: ["rent", "sale", "all"],
      storage_type: [
        "storage_unit",
        "warehouse_box",
        "mini_warehouse",
        "pallet_space",
        "container",
        "other",
      ],
      subscription_status: [
        "pending",
        "active",
        "paused",
        "past_due",
        "cancelled",
        "expired",
      ],
      viewing_status: ["scheduled", "confirmed", "completed", "cancelled"],
      viewing_type: ["rental", "sale"],
    },
  },
} as const
