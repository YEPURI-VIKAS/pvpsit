// PDF export using jspdf + jspdf-autotable
export const exportToPDF = async (title: string, columns: string[], rows: string[][], filename: string) => {
  try {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 138); // #1E3A8A
    doc.text(title, 14, 22);

    // Subtitle with date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 14, 30);

    // Table
    autoTable(doc, {
      head: [columns],
      body: rows,
      startY: 36,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    doc.save(`${filename}.pdf`);
  } catch (error) {
    console.error('PDF export failed. Make sure jspdf and jspdf-autotable are installed:', error);
    throw new Error('PDF export is not available. Please install jspdf and jspdf-autotable.');
  }
};

// Excel export using xlsx
export const exportToExcel = async (title: string, columns: string[], rows: string[][], filename: string) => {
  try {
    const XLSX = await import('xlsx');

    const worksheetData = [columns, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    worksheet['!cols'] = columns.map(() => ({ wch: 20 }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, title);
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  } catch (error) {
    console.error('Excel export failed. Make sure xlsx is installed:', error);
    throw new Error('Excel export is not available. Please install the xlsx package.');
  }
};
