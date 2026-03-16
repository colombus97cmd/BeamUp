import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
    }

    const jwt = process.env.NEXT_PUBLIC_PINATA_JWT; // On utilise la même variable pour l'instant

    const formData = new FormData();
    formData.append('file', file);
    formData.append('pinataMetadata', JSON.stringify({ name: file.name }));
    formData.append('pinataOptions', JSON.stringify({ cidVersion: 0 }));

    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`
      },
      body: formData
    });

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error("Erreur serveur upload:", error);
    return NextResponse.json({ error: "Échec de l'upload vers Pinata" }, { status: 500 });
  }
}