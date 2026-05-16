import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cep: string }> },
) {
  const { cep } = await params;
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) {
    return NextResponse.json({ erro: true }, { status: 400 });
  }

  try {
    const upstream = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      next: { revalidate: 86400 },
    });

    if (!upstream.ok) {
      return NextResponse.json({ erro: true }, { status: upstream.status });
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { erro: true },
      { status: 502 },
    );
  }
}