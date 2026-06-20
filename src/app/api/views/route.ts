import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const VIEWS_FILE_PATH = path.join(process.cwd(), 'src/data/views.json');

interface WorkStats {
  views: number;
  completed: number;
  inProgress: number;
}

function getViews(): Record<string, WorkStats> {
  try {
    const dir = path.dirname(VIEWS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(VIEWS_FILE_PATH)) {
      fs.writeFileSync(VIEWS_FILE_PATH, JSON.stringify({}));
    }
    const data = fs.readFileSync(VIEWS_FILE_PATH, 'utf-8');
    return JSON.parse(data) as Record<string, WorkStats>;
  } catch (error) {
    console.error("Error reading views file:", error);
    return {};
  }
}

function saveViews(views: Record<string, WorkStats>) {
  try {
    fs.writeFileSync(VIEWS_FILE_PATH, JSON.stringify(views, null, 2));
  } catch (error) {
    console.error("Error writing views file:", error);
  }
}

export async function GET() {
  const views = getViews();
  return NextResponse.json(views);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workId, type } = body;

    if (workId === undefined || isNaN(Number(workId))) {
      return NextResponse.json({ error: "workId invalide" }, { status: 400 });
    }

    if (!type || !['view', 'completed', 'inProgress'].includes(type)) {
      return NextResponse.json({ error: "type invalide" }, { status: 400 });
    }

    const views = getViews();
    const workKey = String(workId);
    
    if (!views[workKey]) {
      views[workKey] = { views: 0, completed: 0, inProgress: 0 };
    }

    if (type === 'view') {
      views[workKey].views += 1;
    } else if (type === 'completed') {
      views[workKey].completed += 1;
    } else if (type === 'inProgress') {
      views[workKey].inProgress += 1;
    }

    saveViews(views);

    return NextResponse.json({ success: true, stats: views[workKey] });
  } catch (error) {
    console.error("Error updating stats:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
