import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { requireUser } from '../../../../../lib/auth/server';
export async function GET(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, response } = await requireUser(); if (!user) return response!;
  const { id } = await params;
  const { data: p, error } = await supabase.from('proposals').select('*,prospects!inner(user_id)').eq('id', id).eq('prospects.user_id', user.id).single();
  if (error || !p) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  const pdf = await PDFDocument.create(); let page = pdf.addPage([595, 842]); const font = await pdf.embedFont(StandardFonts.Helvetica); let y = 790;
  const draw = (txt: string, size = 11) => { for (const line of txt.split('\n')) { if (y < 50) { page = pdf.addPage([595, 842]); y = 790; } page.drawText(line.slice(0, 105), { x: 45, y, size, font, color: rgb(.1, .1, .12) }); y -= size + 8; } };
  draw(p.content?.title || p.title || 'Proposal', 22); draw(p.content?.businessName || '', 14);
  for (const s of Object.values(p.content?.sections || {})) { draw((s as any).heading || '', 14); draw((s as any).content || '', 11); y -= 8; }
  const bytes = await pdf.save(); return new NextResponse(Buffer.from(bytes), { headers: { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="proposal-${id}.pdf"` } });
}
