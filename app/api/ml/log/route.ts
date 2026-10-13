import { NextResponse } from 'next/server';
// Only the authoritative assessment endpoint may record model results.
export async function POST() { return NextResponse.json({ error: 'Prediction logging is performed when saving an assessment.' }, { status: 405 }); }
