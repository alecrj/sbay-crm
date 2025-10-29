-- Migration: Add Multi-Unit Property Support
-- Date: 2025-01-29
-- Description: Adds ability to create multi-unit buildings with child units

-- Add property_type column to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS property_type VARCHAR(50) DEFAULT 'single' CHECK (property_type IN ('single', 'multi_unit'));

-- Add parent_property_id column to properties table for child units
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS parent_property_id UUID REFERENCES properties(id) ON DELETE CASCADE;

-- Create index for faster queries on parent properties
CREATE INDEX IF NOT EXISTS idx_properties_parent_property_id ON properties(parent_property_id);

-- Create index for property_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON properties(property_type);

-- Add comment to columns for documentation
COMMENT ON COLUMN properties.property_type IS 'Type of property: single (default) or multi_unit (parent building with units)';
COMMENT ON COLUMN properties.parent_property_id IS 'For child units: references the parent building. NULL for standalone properties and parent buildings';

-- Update existing properties to have 'single' type (if column was just added and has NULL values)
UPDATE properties SET property_type = 'single' WHERE property_type IS NULL;
