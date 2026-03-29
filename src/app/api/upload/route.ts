import { NextRequest, NextResponse } from "next/server";

// POST /api/upload — converte imagem para data URL (base64)
// Funciona em ambiente serverless (Vercel) sem precisar de filesystem
export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const file: File | null = data.get("file") as unknown as File;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Validate file type (images only)
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Apenas imagens são permitidas" }, { status: 400 });
    }

    // Validate file size (2MB max para base64)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Arquivo muito grande. Máximo: 2MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({ url: dataUrl }, { status: 201 });

  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Falha ao fazer upload do arquivo" },
      { status: 500 }
    );
  }
}
