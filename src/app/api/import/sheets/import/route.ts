import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, convertSheetDataToLeads, LeadMapping } from '@/lib/google-sheets';
import { supabase } from '@/lib/supabase';
import { scheduleLeadNotification } from '@/lib/notification-scheduler';

export async function POST(request: NextRequest) {
  try {
    const {
      spreadsheetId,
      sheetName,
      mapping,
      options = {},
      importSettings = {}
    } = await request.json();

    if (!spreadsheetId || !sheetName || !mapping) {
      return NextResponse.json({
        error: 'Spreadsheet ID, sheet name, and field mapping are required'
      }, { status: 400 });
    }

    const {
      startRow = 0,
      endRow,
      skipDuplicates = true,
      sendNotifications = false,
      batchSize = 50
    } = importSettings;

    // Get sheet data
    const range = `${sheetName}!A:Z`;
    console.log(`Fetching data from ${spreadsheetId}, range: ${range}`);
    const sheetData = await getSheetData(spreadsheetId, range);

    if (sheetData.totalRows === 0) {
      return NextResponse.json({
        error: 'No data found in the specified sheet'
      }, { status: 400 });
    }

    // Convert sheet data to leads
    const convertOptions = {
      startRow,
      endRow: endRow || sheetData.totalRows,
      ...options
    };

    console.log(`Converting ${sheetData.totalRows} rows to leads`);
    const leads = convertSheetDataToLeads(sheetData, mapping as LeadMapping, convertOptions);

    if (leads.length === 0) {
      return NextResponse.json({
        error: 'No valid leads found after processing the data'
      }, { status: 400 });
    }

    console.log(`Processed ${leads.length} valid leads`);

    // Prepare import results
    const results = {
      totalProcessed: leads.length,
      imported: 0,
      skipped: 0,
      errors: 0,
      duplicates: 0,
      errorDetails: [] as Array<{ row: number; error: string; email?: string }>,
      duplicateEmails: [] as string[],
    };

    // Import leads in batches
    const batches = [];
    for (let i = 0; i < leads.length; i += batchSize) {
      batches.push(leads.slice(i, i + batchSize));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} leads)`);

      for (const lead of batch) {
        try {
          // Check for duplicates if enabled
          if (skipDuplicates) {
            const { data: existingLead } = await supabase
              .from('leads')
              .select('id, email')
              .eq('email', lead.email)
              .single();

            if (existingLead) {
              results.duplicates++;
              results.duplicateEmails.push(lead.email);
              results.skipped++;
              continue;
            }
          }

          // Insert the lead
          const { data: newLead, error } = await supabase
            .from('leads')
            .insert([{
              name: lead.name,
              email: lead.email,
              phone: lead.phone || null,
              company: lead.company || null,
              title: lead.title,
              type: lead.type,
              status: lead.status,
              priority: lead.priority,
              property_interest: lead.property_interest || null,
              space_requirements: lead.space_requirements || null,
              budget: lead.budget || null,
              timeline: lead.timeline || null,
              message: lead.message || null,
              source: lead.source,
              consultation_date: lead.consultation_date,
              consultation_time: lead.consultation_time || null,
              follow_up_date: lead.follow_up_date,
            }])
            .select()
            .single();

          if (error) {
            console.error(`Error inserting lead ${lead.email}:`, error);
            results.errors++;
            results.errorDetails.push({
              row: lead.import_row,
              error: error.message,
              email: lead.email,
            });
            continue;
          }

          if (newLead) {
            results.imported++;

            // Log the import activity
            await supabase
              .from('lead_activities')
              .insert([{
                lead_id: newLead.id,
                activity_type: 'note',
                title: 'Lead imported',
                description: `Lead imported from Google Sheets (Row ${lead.import_row})`,
                metadata: {
                  import_source: 'google-sheets',
                  import_row: lead.import_row,
                  spreadsheet_id: spreadsheetId,
                  sheet_name: sheetName,
                }
              }]);

            // Schedule notification if enabled
            if (sendNotifications) {
              try {
                await scheduleLeadNotification(newLead.id, {
                  name: lead.name,
                  email: lead.email,
                  phone: lead.phone,
                  company: lead.company,
                  source: `google-sheets (${lead.source})`,
                  priority: lead.priority,
                });
              } catch (notificationError) {
                console.error('Failed to schedule notification for imported lead:', notificationError);
                // Don't fail the import for notification errors
              }
            }
          }
        } catch (error) {
          console.error(`Unexpected error processing lead ${lead.email}:`, error);
          results.errors++;
          results.errorDetails.push({
            row: lead.import_row,
            error: error instanceof Error ? error.message : 'Unknown error',
            email: lead.email,
          });
        }
      }
    }

    // Calculate final stats
    results.skipped = results.duplicates + results.errors;

    console.log('Import completed:', results);

    return NextResponse.json({
      success: true,
      results,
      summary: {
        totalRows: sheetData.totalRows,
        validLeads: leads.length,
        imported: results.imported,
        skipped: results.skipped,
        duplicates: results.duplicates,
        errors: results.errors,
      }
    });

  } catch (error) {
    console.error('Error importing sheet data:', error);

    let errorMessage = 'Failed to import sheet data';
    if (error instanceof Error) {
      if (error.message.includes('Unable to parse range')) {
        errorMessage = 'Invalid sheet range. Please check the sheet name.';
      } else if (error.message.includes('not found')) {
        errorMessage = 'Spreadsheet not found. Please check the ID and access permissions.';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Permission denied. Ensure the spreadsheet is shared with your Google account.';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}