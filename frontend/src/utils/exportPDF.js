import jsPDF from 'jspdf';

export function exportScriptsPDF(scriptData, metadata) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageW - margin * 2;
  let y = margin;

  // Helper: add text with wrapping
  const addText = (text, fontSize = 11, color = [226, 226, 240], bold = false) => {
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(String(text || ''), contentWidth);
    lines.forEach((line) => {
      if (y > 275) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += fontSize * 0.45;
    });
    y += 2;
  };

  const addDivider = () => {
    doc.setDrawColor(45, 45, 78);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
  };

  const addSection = (label, value) => {
    addText(label, 9, [136, 136, 170], true);
    addText(value, 10, [226, 226, 240]);
    y += 1;
  };

  // Header
  doc.setFillColor(15, 15, 26);
  doc.rect(0, 0, pageW, 40, 'F');
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, 5, 40, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(99, 102, 241);
  doc.text('AI Script Generator', margin + 2, 17);
  doc.setFontSize(10);
  doc.setTextColor(136, 136, 170);
  doc.text('Viral Script Report', margin + 2, 25);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, margin + 2, 32);
  y = 50;

  // Metadata
  addText('SCRIPT DETAILS', 9, [99, 102, 241], true);
  y += 1;
  const meta = [
    ['Topic', metadata.topic],
    ['Niche', metadata.niche],
    ['Platform', metadata.platform],
    ['Tone', metadata.tone],
    ['Language', metadata.language],
    ['Duration', `${metadata.duration_sec} seconds`],
    ['Audience', metadata.audience],
  ];
  meta.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(136, 136, 170);
    doc.text(`${k}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(226, 226, 240);
    doc.text(String(v || ''), margin + 30, y);
    y += 5;
  });
  y += 5;
  addDivider();

  // Variations
  const variations = scriptData?.variations || [];
  variations.forEach((v, idx) => {
    if (y > 240) { doc.addPage(); y = margin; }
    // Variation header
    doc.setFillColor(26, 26, 46);
    doc.roundedRect(margin - 3, y - 4, contentWidth + 6, 14, 2, 2, 'F');
    addText(`VARIATION ${v.variation_number || idx + 1} — ${(v.hook_style || '').toUpperCase()} HOOK`, 12, [99, 102, 241], true);
    y += 2;
    addSection('🎣 HOOK', v.hook);
    addSection('📝 SCRIPT', v.script);
    addSection('📣 CALL TO ACTION', v.cta);
    addSection('💬 CAPTION', v.caption);
    if (v.hashtags?.length) addSection('#️⃣ HASHTAGS', v.hashtags.join(' '));
    if (v.shot_suggestions?.length) addSection('🎬 SHOT SUGGESTIONS', v.shot_suggestions.join('\n'));
    addSection('🎙️ VOICEOVER STYLE', v.voiceover_style);
    if (idx < variations.length - 1) { addDivider(); }
  });

  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(136, 136, 170);
    doc.text(`AI Script Generator — Page ${i} of ${totalPages}`, margin, 290);
  }

  const filename = `scripts_${metadata.topic?.slice(0, 20).replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  doc.save(filename);
}
