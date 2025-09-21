import { NextRequest, NextResponse } from 'next/server';
import { previewSheetData, getAvailableSheets } from '@/lib/google-sheets';

export async function POST(request: NextRequest) {
  try {
    const { spreadsheetId, sheetName, range } = await request.json();

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Spreadsheet ID is required' }, { status: 400 });
    }

    // If no sheet name provided, get available sheets
    if (!sheetName) {
      const availableSheets = await getAvailableSheets(spreadsheetId);
      return NextResponse.json({ availableSheets });
    }

    // Preview the specified sheet
    const sheetRange = range || `${sheetName}!A1:Z10`;
    const preview = await previewSheetData(spreadsheetId, sheetRange);

    return NextResponse.json({
      success: true,
      preview,
      spreadsheetId,
      sheetName,
    });
  } catch (error) {
    console.error('Error previewing sheet:', error);

    let errorMessage = 'Failed to preview sheet';
    if (error instanceof Error) {
      if (error.message.includes('Unable to parse range')) {
        errorMessage = 'Invalid sheet range. Please check the sheet name and range format.';
      } else if (error.message.includes('not found')) {
        errorMessage = 'Spreadsheet not found. Please check the ID and ensure you have access.';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Permission denied. Please ensure the spreadsheet is shared with your Google account.';
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