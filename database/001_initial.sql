-- Satu akun memiliki satu buku kas. Semua nominal adalah rupiah bulat.
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS books (
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 50),
  opening_balance bigint NOT NULL DEFAULT 0 CHECK (opening_balance BETWEEN 0 AND 999999999999),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0)
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS transactions (
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('income', 'expense')),
  amount bigint NOT NULL CHECK (amount BETWEEN 1 AND 999999999999),
  transaction_date date NOT NULL CHECK (transaction_date BETWEEN '2000-01-01' AND '2100-12-31'),
  category text NOT NULL,
  description text NOT NULL CHECK (char_length(trim(description)) BETWEEN 1 AND 160),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, id),
  CHECK (
    (kind = 'income' AND category IN ('Gaji', 'Pemberian', 'Usaha', 'Lainnya')) OR
    (kind = 'expense' AND category IN ('Belanja', 'Makanan', 'Tagihan', 'Transportasi', 'Kesehatan', 'Lainnya'))
  )
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS transactions_book_date_idx
  ON transactions (account_id, transaction_date, created_at, id);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS sessions_account_idx ON sessions (account_id);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS login_limits (
  bucket text PRIMARY KEY,
  attempts integer NOT NULL,
  resets_at timestamptz NOT NULL
);

--> statement-breakpoint

-- Seluruh perubahan berada dalam SATU transaksi PostgreSQL.
-- Kunci baris buku mencegah dua perangkat menimpa perubahan satu sama lain.
CREATE OR REPLACE FUNCTION mutate_book(
  p_account uuid,
  p_revision integer,
  p_action text,
  p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_revision integer;
  v_item jsonb;
BEGIN
  SELECT revision INTO v_revision
  FROM books WHERE account_id = p_account FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOK_NOT_FOUND';
  END IF;

  -- ID permintaan tetap sama ketika pengguna mencoba lagi setelah koneksi putus.
  IF p_action = 'create' AND EXISTS (
    SELECT 1 FROM transactions
    WHERE account_id = p_account AND id = (p_payload->>'id')::uuid
  ) THEN
    RETURN;
  END IF;

  IF v_revision <> p_revision THEN
    RAISE EXCEPTION 'BOOK_CONFLICT';
  END IF;

  IF p_action = 'create' THEN
    IF (SELECT count(*) FROM transactions WHERE account_id = p_account) >= 5000 THEN
      RAISE EXCEPTION 'BOOK_FULL';
    END IF;

    INSERT INTO transactions (account_id, id, kind, amount, transaction_date, category, description)
    VALUES (
      p_account, (p_payload->>'id')::uuid, p_payload->>'kind',
      (p_payload->>'amount')::bigint, (p_payload->>'date')::date,
      p_payload->>'category', p_payload->>'description'
    );

  ELSIF p_action = 'update' THEN
    UPDATE transactions SET
      kind = p_payload->>'kind',
      amount = (p_payload->>'amount')::bigint,
      transaction_date = (p_payload->>'date')::date,
      category = p_payload->>'category',
      description = p_payload->>'description'
    WHERE account_id = p_account AND id = (p_payload->>'id')::uuid;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'TRANSACTION_NOT_FOUND';
    END IF;

  ELSIF p_action = 'delete' THEN
    DELETE FROM transactions
    WHERE account_id = p_account AND id = (p_payload->>'id')::uuid;

  ELSIF p_action = 'settings' THEN
    UPDATE books SET
      name = p_payload->>'name',
      opening_balance = (p_payload->>'openingBalance')::bigint
    WHERE account_id = p_account;

  ELSIF p_action = 'restore' THEN
    IF jsonb_array_length(p_payload->'transactions') > 5000 THEN
      RAISE EXCEPTION 'BOOK_FULL';
    END IF;

    DELETE FROM transactions WHERE account_id = p_account;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_payload->'transactions') LOOP
      INSERT INTO transactions (account_id, id, kind, amount, transaction_date, category, description, created_at)
      VALUES (
        p_account, (v_item->>'id')::uuid, v_item->>'kind',
        (v_item->>'amount')::bigint, (v_item->>'date')::date,
        v_item->>'category', v_item->>'description', (v_item->>'createdAt')::timestamptz
      );
    END LOOP;

    UPDATE books SET
      name = p_payload->'settings'->>'name',
      opening_balance = (p_payload->'settings'->>'openingBalance')::bigint
    WHERE account_id = p_account;

  ELSE
    RAISE EXCEPTION 'INVALID_ACTION';
  END IF;

  UPDATE books SET revision = revision + 1 WHERE account_id = p_account;
END;
$$;
