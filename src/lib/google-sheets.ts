import { google } from 'googleapis';

// Google Sheets API service
const sheets = google.sheets('v4');

// Get OAuth2 client (reuse from calendar integration)
export const getGoogleAuth = () => {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google'
  );

  // Set credentials if available
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    auth.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      access_token: process.env.GOOGLE_ACCESS_TOKEN,
    });
  }

  return auth;
};

// Interface for sheet data
export interface SheetData {
  values: string[][];
  headers: string[];
  totalRows: number;
}

// Interface for lead mapping
export interface LeadMapping {
  name?: number;
  email?: number;
  phone?: number;
  company?: number;
  property_interest?: number;
  space_requirements?: number;
  budget?: number;
  timeline?: number;
  message?: number;
  source?: number;
  priority?: number;
  status?: number;
  type?: number;
  consultation_date?: number;
  consultation_time?: number;
  follow_up_date?: number;
}

// Get sheet data from Google Sheets
export const getSheetData = async (
  spreadsheetId: string,
  range: string = 'Sheet1!A:Z'
): Promise<SheetData> => {
  try {
    const auth = getGoogleAuth();

    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId,
      range,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING',
    });

    const values = response.data.values || [];
    const headers = values.length > 0 ? values[0].map(h => String(h || '')) : [];
    const dataRows = values.slice(1);

    return {
      values: dataRows.map(row =>
        row.map(cell => String(cell || ''))
      ),
      headers,
      totalRows: dataRows.length,
    };
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    throw new Error('Failed to fetch sheet data');
  }
};

// Get available sheets in a spreadsheet
export const getAvailableSheets = async (spreadsheetId: string): Promise<Array<{
  id: number;
  title: string;
  index: number;
}>> => {
  try {
    const auth = getGoogleAuth();

    const response = await sheets.spreadsheets.get({
      auth,
      spreadsheetId,
      fields: 'sheets(properties(sheetId,title,index))',
    });

    return response.data.sheets?.map(sheet => ({
      id: sheet.properties?.sheetId || 0,
      title: sheet.properties?.title || 'Untitled',
      index: sheet.properties?.index || 0,
    })) || [];
  } catch (error) {
    console.error('Error fetching available sheets:', error);
    throw new Error('Failed to fetch available sheets');
  }
};

// Convert sheet data to lead objects
export const convertSheetDataToLeads = (
  sheetData: SheetData,
  mapping: LeadMapping,
  options: {
    startRow?: number;
    endRow?: number;
    defaultSource?: string;
    defaultPriority?: string;
    defaultStatus?: string;
    defaultType?: string;
  } = {}
): Array<any> => {
  const {
    startRow = 0,
    endRow = sheetData.values.length,
    defaultSource = 'google-sheets',
    defaultPriority = 'medium',
    defaultStatus = 'new',
    defaultType = 'general-inquiry',
  } = options;

  const leads: Array<any> = [];
  const rowsToProcess = sheetData.values.slice(startRow, endRow);

  rowsToProcess.forEach((row, index) => {
    try {
      // Skip empty rows
      if (row.every(cell => !cell || cell.trim() === '')) {
        return;
      }

      // Extract data based on mapping
      const lead = {
        // Required fields
        name: mapping.name !== undefined ? (row[mapping.name] || '').trim() : '',
        email: mapping.email !== undefined ? (row[mapping.email] || '').trim() : '',
        title: '', // Will be generated from other fields

        // Optional fields with defaults
        phone: mapping.phone !== undefined ? (row[mapping.phone] || '').trim() : '',
        company: mapping.company !== undefined ? (row[mapping.company] || '').trim() : '',
        property_interest: mapping.property_interest !== undefined ? (row[mapping.property_interest] || '').trim() : '',
        space_requirements: mapping.space_requirements !== undefined ? (row[mapping.space_requirements] || '').trim() : '',
        budget: mapping.budget !== undefined ? (row[mapping.budget] || '').trim() : '',
        timeline: mapping.timeline !== undefined ? (row[mapping.timeline] || '').trim() : '',
        message: mapping.message !== undefined ? (row[mapping.message] || '').trim() : '',

        // System fields with smart defaults
        source: mapping.source !== undefined ? (row[mapping.source] || defaultSource).trim() : defaultSource,
        priority: mapping.priority !== undefined ? (row[mapping.priority] || defaultPriority).trim() : defaultPriority,
        status: mapping.status !== undefined ? (row[mapping.status] || defaultStatus).trim() : defaultStatus,
        type: mapping.type !== undefined ? (row[mapping.type] || defaultType).trim() : defaultType,

        // Date fields
        consultation_date: mapping.consultation_date !== undefined ? parseDate(row[mapping.consultation_date]) : null,
        consultation_time: mapping.consultation_time !== undefined ? (row[mapping.consultation_time] || '').trim() : '',
        follow_up_date: mapping.follow_up_date !== undefined ? parseDate(row[mapping.follow_up_date]) : null,

        // Metadata
        import_source: 'google-sheets',
        import_row: startRow + index + 1,
        import_timestamp: new Date().toISOString(),
      };

      // Validate required fields
      if (!lead.name || !lead.email) {
        console.warn(`Skipping row ${startRow + index + 1}: Missing name or email`);
        return;
      }

      // Validate email format
      if (!isValidEmail(lead.email)) {
        console.warn(`Skipping row ${startRow + index + 1}: Invalid email format: ${lead.email}`);
        return;
      }

      // Generate title if not provided
      if (!lead.title) {
        lead.title = generateLeadTitle(lead);
      }

      // Normalize field values
      lead.priority = normalizePriority(lead.priority);
      lead.status = normalizeStatus(lead.status);
      lead.type = normalizeType(lead.type);
      lead.source = normalizeSource(lead.source);

      leads.push(lead);
    } catch (error) {
      console.error(`Error processing row ${startRow + index + 1}:`, error);
    }
  });

  return leads;
};

// Helper function to parse dates
const parseDate = (dateValue: string): string | null => {
  if (!dateValue || dateValue.trim() === '') return null;

  try {
    // Try to parse various date formats
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return null;

    return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  } catch {
    return null;
  }
};

// Helper function to validate email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Helper function to generate lead title
const generateLeadTitle = (lead: any): string => {
  if (lead.property_interest) {
    return `${lead.property_interest} - ${lead.name}`;
  }
  if (lead.company) {
    return `${lead.company} Inquiry - ${lead.name}`;
  }
  return `General Inquiry - ${lead.name}`;
};

// Helper functions to normalize field values
const normalizePriority = (priority: string): string => {
  const normalized = priority.toLowerCase().trim();
  const validPriorities = ['low', 'medium', 'high', 'urgent'];

  // Map common variations
  const priorityMap: Record<string, string> = {
    '1': 'low',
    '2': 'medium',
    '3': 'high',
    '4': 'urgent',
    'normal': 'medium',
    'standard': 'medium',
    'critical': 'urgent',
    'hot': 'urgent',
    'warm': 'medium',
    'cold': 'low',
  };

  return priorityMap[normalized] || (validPriorities.includes(normalized) ? normalized : 'medium');
};

const normalizeStatus = (status: string): string => {
  const normalized = status.toLowerCase().trim();
  const validStatuses = ['new', 'contacted', 'qualified', 'proposal-sent', 'closed-won', 'closed-lost'];

  // Map common variations
  const statusMap: Record<string, string> = {
    'fresh': 'new',
    'uncontacted': 'new',
    'reached-out': 'contacted',
    'in-progress': 'contacted',
    'interested': 'qualified',
    'hot': 'qualified',
    'proposal': 'proposal-sent',
    'quote-sent': 'proposal-sent',
    'won': 'closed-won',
    'closed': 'closed-won',
    'lost': 'closed-lost',
    'dead': 'closed-lost',
    'not-interested': 'closed-lost',
  };

  return statusMap[normalized] || (validStatuses.includes(normalized) ? normalized : 'new');
};

const normalizeType = (type: string): string => {
  const normalized = type.toLowerCase().trim();
  const validTypes = ['consultation', 'property-inquiry', 'general-inquiry', 'contact-form'];

  // Map common variations
  const typeMap: Record<string, string> = {
    'consult': 'consultation',
    'meeting': 'consultation',
    'appointment': 'consultation',
    'property': 'property-inquiry',
    'listing': 'property-inquiry',
    'space': 'property-inquiry',
    'general': 'general-inquiry',
    'question': 'general-inquiry',
    'form': 'contact-form',
    'website': 'contact-form',
  };

  return typeMap[normalized] || (validTypes.includes(normalized) ? normalized : 'general-inquiry');
};

const normalizeSource = (source: string): string => {
  const normalized = source.toLowerCase().trim();
  const validSources = ['website', 'referral', 'cold-call', 'email-campaign', 'social-media', 'trade-show', 'other'];

  // Map common variations
  const sourceMap: Record<string, string> = {
    'web': 'website',
    'site': 'website',
    'online': 'website',
    'ref': 'referral',
    'word-of-mouth': 'referral',
    'call': 'cold-call',
    'phone': 'cold-call',
    'email': 'email-campaign',
    'newsletter': 'email-campaign',
    'social': 'social-media',
    'facebook': 'social-media',
    'linkedin': 'social-media',
    'instagram': 'social-media',
    'twitter': 'social-media',
    'event': 'trade-show',
    'conference': 'trade-show',
    'fair': 'trade-show',
  };

  return sourceMap[normalized] || (validSources.includes(normalized) ? normalized : 'other');
};

// Preview sheet data for mapping
export const previewSheetData = async (
  spreadsheetId: string,
  range: string = 'Sheet1!A1:Z10'
): Promise<{
  headers: string[];
  sampleRows: string[][];
  totalRows: number;
}> => {
  try {
    const auth = getGoogleAuth();

    // Get a preview of the data
    const previewResponse = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId,
      range,
    });

    // Get total row count
    const fullResponse = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId,
      range: range.split('!')[0] + '!A:A',
    });

    const previewValues = previewResponse.data.values || [];
    const headers = previewValues.length > 0 ? previewValues[0].map(h => String(h || '')) : [];
    const sampleRows = previewValues.slice(1, 6).map(row => // Show up to 5 sample rows
      row.map(cell => String(cell || ''))
    );

    return {
      headers,
      sampleRows,
      totalRows: (fullResponse.data.values?.length || 1) - 1, // Subtract header row
    };
  } catch (error) {
    console.error('Error previewing sheet data:', error);
    throw new Error('Failed to preview sheet data');
  }
};