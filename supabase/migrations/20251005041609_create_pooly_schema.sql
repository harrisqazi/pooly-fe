/*
  # Pooly - Pooled Wallet Application Database Schema

  1. New Tables
    - `users_extended`
      - `id` (uuid, primary key, references auth.users)
      - `firebase_uid` (text) - Firebase authentication ID
      - `phone` (text) - User phone number
      - `kyc_status` (text) - KYC verification status: required, pending, approved, failed
      - `kyc_documents` (jsonb) - Array of uploaded KYC document URLs
      - `date_of_birth` (date) - User's date of birth
      - `address` (jsonb) - Contains: street, city, state, zip
      - `ssn_last_four` (text) - Last 4 digits of SSN
      - `settings` (jsonb) - Contains: payment_provider (orum, astra, ach_only)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `groups`
      - `id` (uuid, primary key)
      - `name` (text, required) - Group name
      - `description` (text) - Group description
      - `group_code` (text, required, unique) - 6-character join code
      - `owner_id` (uuid, required) - References auth.users
      - `member_ids` (jsonb) - Array of member user IDs
      - `approval_threshold` (integer, required) - Number of approvals needed
      - `total_balance` (bigint, default 0) - Total balance in cents
      - `member_balances` (jsonb) - Maps user IDs to balances in cents
      - `spending_limits` (jsonb) - daily_limit, monthly_limit, per_transaction_limit
      - `blocked_mcc` (jsonb) - Array of blocked merchant category codes
      - `card_status` (text, default 'active') - active, paused, locked
      - `card_image_url` (text) - Custom card background image URL
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `transactions`
      - `id` (uuid, primary key)
      - `group_id` (uuid, required) - References groups
      - `user_id` (uuid, required) - References auth.users
      - `type` (text, required) - deposit, withdrawal, card_spend, transfer
      - `amount` (bigint, required) - Amount in cents
      - `description` (text) - Transaction description
      - `status` (text, default 'pending') - pending, approved, denied, completed, failed
      - `approval_count` (integer, default 0) - Number of approvals received
      - `approved_by` (jsonb) - Array of user IDs who approved
      - `denied_by` (jsonb) - Array of user IDs who denied
      - `merchant_name` (text) - Merchant name for card transactions
      - `mcc` (text) - Merchant category code
      - `payment_method` (text) - ach, instant, fedNow, rtp, push_to_debit
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `approvals`
      - `id` (uuid, primary key)
      - `transaction_id` (uuid, required) - References transactions
      - `group_id` (uuid, required) - References groups
      - `requester_id` (uuid, required) - References auth.users
      - `approver_id` (uuid, required) - References auth.users
      - `status` (text, default 'pending') - pending, approved, denied
      - `approved_at` (timestamptz) - When approval was given
      - `notes` (text) - Optional approver notes
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can read/update their own extended profile
    - Group members can read their groups
    - Group owners can update their groups
    - Users can read transactions for their groups
    - Users can read/update approvals where they are the approver

  3. Indexes
    - Index on group_code for fast lookups
    - Index on user_id for user-specific queries
    - Index on group_id for group-specific queries
    - Index on transaction status for filtering
    - Index on approval status for filtering

  4. Functions
    - Function to generate unique 6-character group codes
    - Trigger to update updated_at timestamps
*/

-- Create users_extended table
CREATE TABLE IF NOT EXISTS users_extended (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  firebase_uid text,
  phone text,
  kyc_status text DEFAULT 'required' CHECK (kyc_status IN ('required', 'pending', 'approved', 'failed')),
  kyc_documents jsonb DEFAULT '[]'::jsonb,
  date_of_birth date,
  address jsonb DEFAULT '{}'::jsonb,
  ssn_last_four text,
  settings jsonb DEFAULT '{"payment_provider": "orum"}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  group_code text NOT NULL UNIQUE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_ids jsonb DEFAULT '[]'::jsonb,
  approval_threshold integer NOT NULL DEFAULT 1 CHECK (approval_threshold >= 1),
  total_balance bigint DEFAULT 0,
  member_balances jsonb DEFAULT '{}'::jsonb,
  spending_limits jsonb DEFAULT '{"daily_limit": 50000, "monthly_limit": 500000, "per_transaction_limit": 10000}'::jsonb,
  blocked_mcc jsonb DEFAULT '[]'::jsonb,
  card_status text DEFAULT 'active' CHECK (card_status IN ('active', 'paused', 'locked')),
  card_image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'card_spend', 'transfer')),
  amount bigint NOT NULL,
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'completed', 'failed')),
  approval_count integer DEFAULT 0,
  approved_by jsonb DEFAULT '[]'::jsonb,
  denied_by jsonb DEFAULT '[]'::jsonb,
  merchant_name text,
  mcc text,
  payment_method text CHECK (payment_method IN ('ach', 'instant', 'fedNow', 'rtp', 'push_to_debit')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create approvals table
CREATE TABLE IF NOT EXISTS approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  approved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_groups_group_code ON groups(group_code);
CREATE INDEX IF NOT EXISTS idx_groups_owner_id ON groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_transactions_group_id ON transactions(group_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_approvals_transaction_id ON approvals(transaction_id);
CREATE INDEX IF NOT EXISTS idx_approvals_approver_id ON approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);

-- Function to generate unique 6-character group code
CREATE OR REPLACE FUNCTION generate_group_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_extended_updated_at ON users_extended;
CREATE TRIGGER update_users_extended_updated_at
  BEFORE UPDATE ON users_extended
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_approvals_updated_at ON approvals;
CREATE TRIGGER update_approvals_updated_at
  BEFORE UPDATE ON approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE users_extended ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users_extended
CREATE POLICY "Users can read own extended profile"
  ON users_extended FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own extended profile"
  ON users_extended FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own extended profile"
  ON users_extended FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for groups
CREATE POLICY "Users can read groups they are members of"
  ON groups FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    member_ids::jsonb ? auth.uid()::text
  );

CREATE POLICY "Users can create groups"
  ON groups FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Group owners can update their groups"
  ON groups FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Group owners can delete their groups"
  ON groups FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- RLS Policies for transactions
CREATE POLICY "Users can read transactions for their groups"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = transactions.group_id
      AND (groups.owner_id = auth.uid() OR groups.member_ids::jsonb ? auth.uid()::text)
    )
  );

CREATE POLICY "Group members can create transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_id
      AND (groups.owner_id = auth.uid() OR groups.member_ids::jsonb ? auth.uid()::text)
    )
  );

CREATE POLICY "Users can update their transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for approvals
CREATE POLICY "Users can read approvals for their groups"
  ON approvals FOR SELECT
  TO authenticated
  USING (
    approver_id = auth.uid() OR
    requester_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = approvals.group_id
      AND groups.owner_id = auth.uid()
    )
  );

CREATE POLICY "Group members can create approvals"
  ON approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_id
      AND (groups.owner_id = auth.uid() OR groups.member_ids::jsonb ? auth.uid()::text)
    )
  );

CREATE POLICY "Approvers can update their approvals"
  ON approvals FOR UPDATE
  TO authenticated
  USING (approver_id = auth.uid())
  WITH CHECK (approver_id = auth.uid());