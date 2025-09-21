import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // First, let's check if the properties table exists
    const { data, error, count } = await supabase
      .from('properties')
      .select('*', { count: 'exact' })
      .limit(1)

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      })
    }

    return NextResponse.json({
      success: true,
      tableExists: true,
      sampleData: data,
      totalCount: count
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    })
  }
}

export async function POST() {
  try {
    // Test creating a simple property
    const testProperty = {
      title: "Test Property",
      type: "warehouse",
      location: "Test Location",
      county: "Miami-Dade",
      price: "$10/sq ft",
      size: "10,000 sq ft",
      available: true,
      featured: false,
      description: "Test property for debugging",
      features: ["Test Feature"]
    }

    const { data, error } = await supabase
      .from('properties')
      .insert([testProperty])
      .select()

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error,
        testData: testProperty
      })
    }

    return NextResponse.json({
      success: true,
      message: "Test property created successfully",
      data: data
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    })
  }
}