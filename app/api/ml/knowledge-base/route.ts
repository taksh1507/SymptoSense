import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface ConditionItem {
  id: string;
  name: string;
  category: string;
  urgency: string;
  prevalence: number;
  symptoms: Record<string, number>;
  description: string;
  precautions: string[];
}

interface KnowledgeBaseData {
  version: string;
  source: string;
  total_conditions: number;
  total_symptoms: number;
  symptoms: string[];
  conditions: Record<string, ConditionItem>;
}

let cachedKb: KnowledgeBaseData | null = null;

function loadKnowledgeBase(): KnowledgeBaseData | null {
  if (cachedKb) return cachedKb;
  try {
    const filePath = path.join(process.cwd(), 'ml-service', 'artifacts', 'clinical', 'symcat_knowledge_base.json');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      cachedKb = JSON.parse(raw);
      return cachedKb;
    }
  } catch (err) {
    console.error('Failed to load symcat knowledge base:', err);
  }
  return null;
}

export async function GET(req: Request) {
  const kb = loadKnowledgeBase();
  if (!kb) {
    return NextResponse.json({ error: 'Clinical knowledge base not compiled yet' }, { status: 404 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').toLowerCase().trim();
  const urgencyFilter = url.searchParams.get('urgency') || '';
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '30', 10)));
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));

  let allConditions = Object.values(kb.conditions);

  if (urgencyFilter) {
    allConditions = allConditions.filter(c => c.urgency.toLowerCase() === urgencyFilter.toLowerCase());
  }

  if (q) {
    allConditions = allConditions.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      Object.keys(c.symptoms).some(s => s.toLowerCase().includes(q))
    );
  }

  const totalFiltered = allConditions.length;
  const pagedConditions = allConditions.slice(offset, offset + limit);

  return NextResponse.json({
    version: kb.version,
    source: kb.source,
    stats: {
      total_conditions: kb.total_conditions,
      total_symptoms: kb.total_symptoms,
      core_records: 4920,
      core_diseases: 41,
      architecture: 'Dual-Engine: 41 Core RF + 801 CDC Bayesian Model',
    },
    total: totalFiltered,
    offset,
    limit,
    conditions: pagedConditions,
    sample_symptoms: kb.symptoms.slice(0, 30),
  });
}
