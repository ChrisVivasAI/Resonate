-- Migration: Add endpoint_id to ai_generations
-- Version: 20260127_add_endpoint_id_to_generations

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'ai_generations'
        AND column_name = 'endpoint_id'
    ) THEN
        ALTER TABLE public.ai_generations ADD COLUMN endpoint_id TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'ai_generations'
        AND column_name = 'request_id'
    ) THEN
        ALTER TABLE public.ai_generations ADD COLUMN request_id TEXT;
    END IF;
END $$;
