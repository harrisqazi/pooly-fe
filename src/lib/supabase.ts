import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users_extended: {
        Row: {
          id: string;
          firebase_uid: string | null;
          phone: string | null;
          kyc_status: 'required' | 'pending' | 'approved' | 'failed';
          kyc_documents: string[];
          date_of_birth: string | null;
          address: {
            street?: string;
            city?: string;
            state?: string;
            zip?: string;
          };
          ssn_last_four: string | null;
          settings: {
            payment_provider: 'orum' | 'astra' | 'ach_only';
          };
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users_extended']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users_extended']['Insert']>;
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          group_code: string;
          owner_id: string;
          member_ids: string[];
          approval_threshold: number;
          total_balance: number;
          member_balances: Record<string, number>;
          spending_limits: {
            daily_limit: number;
            monthly_limit: number;
            per_transaction_limit: number;
          };
          blocked_mcc: string[];
          card_status: 'active' | 'paused' | 'locked';
          card_image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['groups']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['groups']['Insert']>;
      };
      transactions: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          type: 'deposit' | 'withdrawal' | 'card_spend' | 'transfer';
          amount: number;
          description: string | null;
          status: 'pending' | 'approved' | 'denied' | 'completed' | 'failed';
          approval_count: number;
          approved_by: string[];
          denied_by: string[];
          merchant_name: string | null;
          mcc: string | null;
          payment_method: 'ach' | 'instant' | 'fedNow' | 'rtp' | 'push_to_debit' | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>;
      };
      approvals: {
        Row: {
          id: string;
          transaction_id: string;
          group_id: string;
          requester_id: string;
          approver_id: string;
          status: 'pending' | 'approved' | 'denied';
          approved_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['approvals']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['approvals']['Insert']>;
      };
    };
  };
};
