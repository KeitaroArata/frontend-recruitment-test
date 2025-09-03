// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";

type User = { id: number; name: string; email: string };

let db: User[] = [
  { id: 1, name: "Alice Tanaka", email: "alice@example.com" },
  { id: 2, name: "Bob Suzuki", email: "bob@example.com" },
  { id: 3, name: "Carol Sato", email: "carol@example.com" },
];

// GET /api/users?q=alice で簡易検索
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").toLowerCase();
  const data = q
    ? db.filter(
        (u) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      )
    : db;
  return NextResponse.json({ users: data }, { status: 200 });
}

// POST /api/users で新規作成
export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<User>;
  if (!body.name || !body.email) {
    return NextResponse.json(
      { message: "name and email are required" },
      { status: 400 }
    );
  }
  // 既存メールは409にすることでクライアントのエラー分岐も見れる
  if (
    db.some((u) => u.email.toLowerCase() === String(body.email).toLowerCase())
  ) {
    return NextResponse.json(
      { message: "email already exists" },
      { status: 409 }
    );
  }
  const id = Math.max(0, ...db.map((u) => u.id)) + 1;
  const user: User = { id, name: body.name!, email: body.email! };
  db.push(user);
  return NextResponse.json({ user }, { status: 201 });
}

// PUT /api/users/:id 相当を簡略化: ?id=1 で upsert（冪等）
export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idParam = searchParams.get("id");
  if (!idParam) {
    return NextResponse.json({ message: "id is required" }, { status: 400 });
  }
  const id = Number(idParam);
  const body = (await req.json()) as Partial<User>;
  if (!body.name || !body.email) {
    return NextResponse.json(
      { message: "name and email are required" },
      { status: 400 }
    );
  }

  const idx = db.findIndex((u) => u.id === id);
  if (idx === -1) {
    // 無ければ作成（UPSERT）→ 201
    const user: User = { id, name: body.name!, email: body.email! };
    db.push(user);
    return NextResponse.json({ user, upsert: "created" }, { status: 201 });
  } else {
    // あれば更新 → 200（冪等: 同値更新でも結果は同じ）
    db[idx] = { id, name: body.name!, email: body.email! };
    return NextResponse.json(
      { user: db[idx], upsert: "updated" },
      { status: 200 }
    );
  }
}

// DELETE /api/users?id=1
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  const before = db.length;
  db = db.filter((u) => u.id !== id);
  const deleted = before !== db.length;
  return NextResponse.json({ deleted }, { status: deleted ? 200 : 404 });
}
