import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mappingJson = formData.get('mapping') as string;
    const skipDuplicates = formData.get('skipDuplicates') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!mappingJson) {
      return NextResponse.json({ error: 'Column mapping required' }, { status: 400 });
    }

    const mapping = JSON.parse(mappingJson);

    // Read CSV file
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file must have headers and at least one data row' }, { status: 400 });
    }

    // Parse CSV (simple parser - handles basic CSV)
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1).map(line => parseCSVLine(line));

    // Prepare import results
    const results = {
      totalProcessed: rows.length,
      imported: 0,
      skipped: 0,
      errors: 0,
      duplicates: 0,
      errorDetails: [] as Array<{ row: number; error: string; email?: string }>,
      duplicateEmails: [] as string[],
    };

    // Process each row
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const rowNumber = rowIndex + 2; // +2 because row 1 is headers, and we're 0-indexed

      try {
        // Map columns to lead fields
        const leadData: any = {
          title: '',
          name: '',
          email: '',
          type: 'general-inquiry',
          status: 'new',
          priority: 'medium',
          source: 'csv-import',
        };

        // Apply mapping
        Object.keys(mapping).forEach(field => {
          const columnIndex = mapping[field];
          if (columnIndex !== undefined && columnIndex < row.length) {
            const value = row[columnIndex]?.replace(/^"|"$/g, '').trim(); // Remove quotes
            if (value) {
              leadData[field] = value;
            }
          }
        });

        // Validate required fields
        if (!leadData.name || !leadData.email) {
          results.errors++;
          results.errorDetails.push({
            row: rowNumber,
            error: 'Missing required fields (name or email)',
            email: leadData.email,
          });
          continue;
        }

        // Auto-generate title if not provided
        if (!leadData.title) {
          leadData.title = `Lead - ${leadData.name}`;
        }

        // Check for duplicates
        if (skipDuplicates) {
          const { data: existingLead } = await supabaseAdmin
            .from('leads')
            .select('id, email')
            .eq('email', leadData.email)
            .single();

          if (existingLead) {
            results.duplicates++;
            results.duplicateEmails.push(leadData.email);
            results.skipped++;
            continue;
          }
        }

        // Insert the lead
        const { data: newLead, error } = await supabaseAdmin
          .from('leads')
          .insert([{
            name: leadData.name,
            email: leadData.email,
            phone: leadData.phone || null,
            company: leadData.company || null,
            title: leadData.title,
            type: leadData.type,
            status: leadData.status,
            priority: leadData.priority,
            property_interest: leadData.property_interest || null,
            space_requirements: leadData.space_requirements || null,
            budget: leadData.budget || null,
            timeline: leadData.timeline || null,
            message: leadData.message || null,
            source: leadData.source,
            consultation_date: leadData.consultation_date || null,
            consultation_time: leadData.consultation_time || null,
            follow_up_date: leadData.follow_up_date || null,
          }])
          .select()
          .single();

        if (error) {
          console.error(`Error inserting lead ${leadData.email}:`, error);
          results.errors++;
          results.errorDetails.push({
            row: rowNumber,
            error: error.message,
            email: leadData.email,
          });
          continue;
        }

        if (newLead) {
          results.imported++;

          // Log the import activity
          await supabaseAdmin
            .from('lead_activities')
            .insert([{
              lead_id: newLead.id,
              activity_type: 'note',
              title: 'Lead imported',
              description: `Lead imported from CSV file (Row ${rowNumber})`,
              metadata: {
                import_source: 'csv-upload',
                import_row: rowNumber,
                filename: file.name,
              }
            }]);
        }
      } catch (error) {
        console.error(`Unexpected error processing row ${rowNumber}:`, error);
        results.errors++;
        results.errorDetails.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        totalRows: rows.length,
        imported: results.imported,
        skipped: results.skipped,
        duplicates: results.duplicates,
        errors: results.errors,
      }
    });

  } catch (error) {
    console.error('Error importing CSV:', error);
    return NextResponse.json({
      error: 'Failed to import CSV file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
