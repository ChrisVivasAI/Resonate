-- Migration: Add result_data JSONB column to ai_generations table
-- Version: 20260128_add_result_data_column
-- Description: The code uses result_data (JSONB) to store structured generation results,
--              but this column was missing from the database, causing inserts to fail.

-- Add result_data JSONB column to ai_generations table
-- This column stores structured data about generation results (images array, urls, videoUrl, etc.)

ALTER TABLE public.ai_generations
ADD COLUMN IF NOT EXISTS result_data JSONB DEFAULT NULL;

-- Add a comment explaining the column
COMMENT ON COLUMN public.ai_generations.result_data IS 'JSONB column storing structured result data including images array, urls, videoUrl, etc.';
