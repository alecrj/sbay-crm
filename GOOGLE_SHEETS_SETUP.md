# Google Sheets Import/Export Setup

## Overview

The CRM can import leads from Google Sheets with intelligent field mapping, data validation, and automatic notification scheduling.

## Features

✅ **Bulk Lead Import**: Import hundreds of leads from Google Sheets
✅ **Smart Field Mapping**: Map spreadsheet columns to CRM fields
✅ **Data Validation**: Email validation, duplicate detection, error handling
✅ **Automatic Notifications**: Schedule email notifications for new imported leads
✅ **Progress Tracking**: Detailed import results and error reporting
✅ **Batch Processing**: Efficient processing of large datasets

## Prerequisites

This feature uses the same Google API credentials as Google Calendar integration. If you haven't set up Google Calendar yet, follow the [Google Calendar Setup Guide](./GOOGLE_CALENDAR_SETUP.md) first.

### Required API Permissions

In addition to Calendar API, enable:
1. **Google Sheets API** in Google Cloud Console
2. Update OAuth scopes to include:
   - `https://www.googleapis.com/auth/spreadsheets.readonly`
   - `https://www.googleapis.com/auth/drive.readonly` (optional, for accessing shared sheets)

## How to Use

### 1. Prepare Your Google Sheet

Create a Google Sheet with lead data. The system supports flexible column mapping, but here's a recommended structure:

| Name | Email | Phone | Company | Property Interest | Budget | Timeline | Source | Priority |
|------|-------|-------|---------|-------------------|---------|----------|---------|----------|
| John Smith | john@example.com | (305) 123-4567 | ABC Corp | Warehouse 5000 sq ft | $3000-5000 | 6 months | Website | High |
| Jane Doe | jane@company.com | (954) 987-6543 | XYZ LLC | Office Space | $2000-3000 | ASAP | Referral | Urgent |

### 2. Share the Sheet

1. Open your Google Sheet
2. Click "Share" button
3. Add your Google account email (the one used for API setup)
4. Grant "Viewer" or "Editor" permissions
5. Copy the spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```

### 3. Use the Import Feature in CRM

1. Go to **Leads** section in the CRM
2. Click **Import from Sheets** button
3. Enter the spreadsheet ID
4. Select the sheet tab (if multiple tabs exist)
5. Map columns to CRM fields
6. Configure import options
7. Preview and confirm import

## API Endpoints

The system provides these endpoints for programmatic access:

### POST `/api/import/sheets/preview`
Preview sheet data and get column mapping
```json
{
  "spreadsheetId": "your-spreadsheet-id",
  "sheetName": "Sheet1",
  "range": "A1:Z10"
}
```

Response:
```json
{
  "success": true,
  "preview": {
    "headers": ["Name", "Email", "Phone", "Company"],
    "sampleRows": [
      ["John Smith", "john@example.com", "(305) 123-4567", "ABC Corp"],
      ["Jane Doe", "jane@company.com", "(954) 987-6543", "XYZ LLC"]
    ],
    "totalRows": 150
  }
}
```

### POST `/api/import/sheets/import`
Import leads from Google Sheets
```json
{
  "spreadsheetId": "your-spreadsheet-id",
  "sheetName": "Sheet1",
  "mapping": {
    "name": 0,
    "email": 1,
    "phone": 2,
    "company": 3,
    "property_interest": 4,
    "budget": 5,
    "timeline": 6,
    "source": 7,
    "priority": 8
  },
  "importSettings": {
    "startRow": 0,
    "endRow": 100,
    "skipDuplicates": true,
    "sendNotifications": false,
    "batchSize": 50
  }
}
```

## Field Mapping

### Required Fields
- **Name** (required): Lead's full name
- **Email** (required): Valid email address (validated automatically)

### Optional Fields
- **Phone**: Contact phone number
- **Company**: Company or organization name
- **Property Interest**: Type of property they're looking for
- **Space Requirements**: Size, features, or special requirements
- **Budget**: Budget range or monthly rent capacity
- **Timeline**: When they need the space
- **Message**: Additional notes or comments
- **Source**: How they found you
- **Priority**: Lead priority level
- **Status**: Current lead status
- **Type**: Type of inquiry
- **Consultation Date**: Preferred meeting date
- **Consultation Time**: Preferred meeting time
- **Follow Up Date**: Scheduled follow-up date

## Data Validation and Normalization

The system automatically:

### Email Validation
- Validates email format using regex
- Rejects invalid emails with detailed error reporting

### Duplicate Detection
- Checks for existing leads with the same email
- Option to skip or update duplicates

### Data Normalization
Automatically normalizes field values:

#### Priority Mapping
- `1` → `low`
- `2` → `medium`
- `3` → `high`
- `4` → `urgent`
- `hot`, `critical` → `urgent`
- `warm`, `normal` → `medium`
- `cold` → `low`

#### Status Mapping
- `fresh`, `uncontacted` → `new`
- `reached-out`, `in-progress` → `contacted`
- `interested`, `hot` → `qualified`
- `proposal`, `quote-sent` → `proposal-sent`
- `won`, `closed` → `closed-won`
- `lost`, `dead`, `not-interested` → `closed-lost`

#### Source Mapping
- `web`, `site`, `online` → `website`
- `ref`, `word-of-mouth` → `referral`
- `call`, `phone` → `cold-call`
- `email`, `newsletter` → `email-campaign`
- `social`, `facebook`, `linkedin` → `social-media`
- `event`, `conference` → `trade-show`

## Import Results

After import completion, you'll receive detailed results:

```json
{
  "success": true,
  "results": {
    "totalProcessed": 100,
    "imported": 85,
    "skipped": 15,
    "errors": 3,
    "duplicates": 12,
    "errorDetails": [
      {
        "row": 45,
        "error": "Invalid email format",
        "email": "invalid-email"
      }
    ],
    "duplicateEmails": ["existing@example.com"]
  },
  "summary": {
    "totalRows": 100,
    "validLeads": 88,
    "imported": 85,
    "skipped": 15,
    "duplicates": 12,
    "errors": 3
  }
}
```

## Best Practices

### Sheet Preparation
1. **Clean Data**: Remove empty rows and columns
2. **Consistent Headers**: Use clear, descriptive column headers
3. **Valid Emails**: Ensure all email addresses are properly formatted
4. **Date Formats**: Use standard date formats (YYYY-MM-DD, MM/DD/YYYY)
5. **Phone Numbers**: Use consistent phone number formatting

### Import Strategy
1. **Test First**: Import a small batch to verify mapping
2. **Batch Processing**: Import large datasets in smaller batches
3. **Backup**: Keep backups of your spreadsheet
4. **Monitor Results**: Review error reports and fix data issues

### Performance Tips
- **Optimal Batch Size**: 50-100 leads per batch for best performance
- **Off-Peak Hours**: Import during off-peak hours for faster processing
- **Network Stability**: Ensure stable internet connection for large imports

## Troubleshooting

### Common Issues

1. **"Spreadsheet not found" error**
   - Verify spreadsheet ID is correct
   - Ensure sheet is shared with your Google account
   - Check that Google Sheets API is enabled

2. **"Permission denied" errors**
   - Confirm sheet sharing permissions
   - Verify Google API credentials are valid
   - Check OAuth scopes include Sheets access

3. **"Invalid range" errors**
   - Verify sheet name spelling
   - Check that specified range exists
   - Ensure sheet has data in the specified range

4. **High error rates during import**
   - Review email format validation
   - Check for special characters in data
   - Verify column mapping is correct

### Error Resolution

1. **Invalid Emails**: Fix email formats in spreadsheet
2. **Missing Required Fields**: Ensure name and email columns are mapped
3. **Duplicate Handling**: Choose appropriate duplicate handling strategy
4. **Rate Limiting**: Reduce batch size if hitting API limits

## Security Considerations

1. **Data Privacy**: Only share sheets with necessary team members
2. **Access Control**: Use viewer permissions when possible
3. **API Keys**: Keep Google API credentials secure
4. **Audit Trail**: Import activities are logged for tracking

## Costs and Limits

### Google Sheets API Limits
- **100 requests per 100 seconds per user**
- **300 requests per minute per project**

### Usage Estimates
- Small import (100 leads): ~2-3 API calls
- Large import (1000 leads): ~20-30 API calls
- Typical monthly usage: Well within free limits

## Advanced Features

### Custom Field Mapping
You can map additional fields by extending the `LeadMapping` interface in the code.

### Export Functionality
While import is implemented, export functionality can be added using similar patterns:
- Export leads to new Google Sheet
- Regular backup exports
- Custom filtered exports

## Integration with Other Features

### Email Notifications
- Imported leads can trigger notification emails to admins
- Configure in import settings: `sendNotifications: true`

### Activity Logging
- All imports are automatically logged in lead activities
- Includes import source, timestamp, and metadata

### Calendar Integration
- Imported leads with consultation dates can automatically create calendar events
- Requires additional development

## Next Steps

Once Google Sheets import is working:
1. Set up regular import schedules for ongoing data sync
2. Create standardized spreadsheet templates
3. Train team on proper data formatting
4. Implement export functionality for backup and reporting
5. Add automated data quality checks