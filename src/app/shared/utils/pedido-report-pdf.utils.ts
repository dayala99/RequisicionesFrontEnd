import { formatDisplayDate } from './date.utils';

export interface PedidoReporteDetallePdf {
  descripcion: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface PedidoReportePdfData {
  pedidoId: number;
  codigoPedido: string;
  fechaSolicitud: string;
  solicitante: string;
  referencia: string;
  tipoServicio: string;
  moneda: string;
  lugarEntrega: string;
  fechaEntrega: string;
  detalle: PedidoReporteDetallePdf[];
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_LEFT = 32;
const PAGE_RIGHT = PAGE_WIDTH - 32;
const FIRST_PAGE_ROWS = 16;
const NEXT_PAGE_ROWS = 26;

export function createPedidoReportPdf(report: PedidoReportePdfData): Blob {
  const detailChunks = chunkDetailRows(report.detalle, FIRST_PAGE_ROWS, NEXT_PAGE_ROWS);
  const pageContents = detailChunks.map((chunk, index) =>
    buildPageContent(report, chunk, index + 1, detailChunks.length, index === 0)
  );

  return new Blob([buildPdfDocument(pageContents)], { type: 'application/pdf' });
}

function chunkDetailRows(rows: PedidoReporteDetallePdf[], firstPageRows: number, nextPageRows: number): PedidoReporteDetallePdf[][] {
  if (!rows.length) {
    return [[]];
  }

  const chunks: PedidoReporteDetallePdf[][] = [];
  let startIndex = 0;
  let currentSize = firstPageRows;

  while (startIndex < rows.length) {
    chunks.push(rows.slice(startIndex, startIndex + currentSize));
    startIndex += currentSize;
    currentSize = nextPageRows;
  }

  return chunks;
}

function buildPageContent(
  report: PedidoReportePdfData,
  detailRows: PedidoReporteDetallePdf[],
  pageNumber: number,
  totalPages: number,
  includeHeaderFields: boolean
): string {
  const commands: string[] = ['0.7 w', '0 0 0 RG'];
  const addText = (x: number, y: number, text: string, size = 10, bold = false, align: 'left' | 'center' | 'right' = 'left', maxWidth?: number) => {
    const safeText = sanitizePdfText(text);
    const fittedText = fitTextToWidth(safeText, size, maxWidth);
    const textWidth = approximateTextWidth(fittedText, size);
    let drawX = x;

    if (align === 'center') {
      drawX = x - textWidth / 2;
    } else if (align === 'right') {
      drawX = x - textWidth;
    }

    commands.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${drawX.toFixed(2)} ${toPdfY(y).toFixed(2)} Td (${escapePdfText(fittedText)}) Tj ET`);
  };
  const addLine = (x1: number, y1: number, x2: number, y2: number) => {
    commands.push(`${x1.toFixed(2)} ${toPdfY(y1).toFixed(2)} m ${x2.toFixed(2)} ${toPdfY(y2).toFixed(2)} l S`);
  };
  const addRect = (x: number, y: number, width: number, height: number) => {
    commands.push(`${x.toFixed(2)} ${toPdfY(y + height).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S`);
  };

  addRect(PAGE_LEFT, 20, PAGE_RIGHT - PAGE_LEFT, 92);
  addText(PAGE_LEFT + 18, 52, 'ARCE', 26, true);
  addText((PAGE_LEFT + PAGE_RIGHT) / 2, 58, 'PEDIDO INTERNO DE COMPRA', 16, true, 'center');
  addText(PAGE_RIGHT - 8, 42, 'COM-PR-001-02', 9, false, 'right');
  addText(PAGE_RIGHT - 8, 56, `Version: 00`, 9, false, 'right');
  addText(PAGE_RIGHT - 8, 70, `Pagina ${pageNumber} de ${totalPages}`, 9, false, 'right');

  let tableStartY = 155;

  if (includeHeaderFields) {
    addRect(PAGE_LEFT, 125, PAGE_RIGHT - PAGE_LEFT, 170);
    addText(PAGE_RIGHT - 12, 138, `Codigo de pedido: ${report.codigoPedido}`, 9, false, 'right');

    addFieldRow(commands, addText, addLine, 148, 'SOLICITANTE', report.solicitante, 'FECHA SOLICITUD', report.fechaSolicitud);
    addFieldRow(commands, addText, addLine, 174, 'REFERENCIA', report.referencia, 'TIPO SERVICIO', report.tipoServicio);
    addFieldRow(commands, addText, addLine, 200, 'MONEDA', report.moneda, 'LUGAR ENTREGA', report.lugarEntrega);
    addFieldRow(commands, addText, addLine, 226, 'FECHA ENTREGA', report.fechaEntrega, 'PEDIDO', report.codigoPedido);

    tableStartY = 320;
  }

  addRect(PAGE_LEFT, tableStartY, PAGE_RIGHT - PAGE_LEFT, 28);
  const colItem = PAGE_LEFT;
  const colCantidad = 78;
  const colUnidad = 150;
  const colDescripcion = 225;
  const colCosto = 435;
  const colSubtotal = 510;
  [colCantidad, colUnidad, colDescripcion, colCosto, colSubtotal].forEach((x) => addLine(x, tableStartY, x, tableStartY + 28));

  addText((colItem + colCantidad) / 2, tableStartY + 18, 'ITEM', 9, true, 'center');
  addText((colCantidad + colUnidad) / 2, tableStartY + 18, 'CANTIDAD', 9, true, 'center');
  addText((colUnidad + colDescripcion) / 2, tableStartY + 18, 'UNID', 9, true, 'center');
  addText((colDescripcion + colCosto) / 2, tableStartY + 18, 'DESCRIPCION DETALLADA', 9, true, 'center');
  addText((colCosto + colSubtotal) / 2, tableStartY + 18, 'P. UNIT.', 9, true, 'center');
  addText((colSubtotal + PAGE_RIGHT) / 2, tableStartY + 18, 'SUBTOTAL', 9, true, 'center');

  let rowY = tableStartY + 28;
  const rowHeight = 22;

  if (!detailRows.length) {
    addRect(PAGE_LEFT, rowY, PAGE_RIGHT - PAGE_LEFT, rowHeight);
    addText((PAGE_LEFT + PAGE_RIGHT) / 2, rowY + 15, 'SIN ITEMS REGISTRADOS PARA ESTE PEDIDO', 10, false, 'center');
  }

  detailRows.forEach((detail, index) => {
    addRect(PAGE_LEFT, rowY, PAGE_RIGHT - PAGE_LEFT, rowHeight);
    [colCantidad, colUnidad, colDescripcion, colCosto, colSubtotal].forEach((x) => addLine(x, rowY, x, rowY + rowHeight));

    addText((colItem + colCantidad) / 2, rowY + 15, String(index + 1 + (pageNumber - 1) * NEXT_PAGE_ROWS), 9, false, 'center');
    addText((colCantidad + colUnidad) / 2, rowY + 15, formatAmount(detail.cantidad, 3), 9, false, 'center');
    addText((colUnidad + colDescripcion) / 2, rowY + 15, detail.unidad, 9, false, 'center', colDescripcion - colUnidad - 10);
    addText(colDescripcion + 6, rowY + 15, detail.descripcion, 9, false, 'left', colCosto - colDescripcion - 12);
    addText(colSubtotal - 10, rowY + 15, formatAmount(detail.precioUnitario), 9, false, 'right');
    addText(PAGE_RIGHT - 10, rowY + 15, formatAmount(detail.subtotal), 9, false, 'right');

    rowY += rowHeight;
  });

  return commands.join('\n');
}

function addFieldRow(
  commands: string[],
  addText: (x: number, y: number, text: string, size?: number, bold?: boolean, align?: 'left' | 'center' | 'right', maxWidth?: number) => void,
  addLine: (x1: number, y1: number, x2: number, y2: number) => void,
  topY: number,
  leftLabel: string,
  leftValue: string,
  rightLabel: string,
  rightValue: string
): void {
  const lineY = topY + 18;
  addText(PAGE_LEFT + 8, topY + 10, `${leftLabel}:`, 9, true);
  addText(PAGE_LEFT + 120, topY + 10, sanitizeFieldValue(leftValue), 9, false, 'left', 155);
  addText(320, topY + 10, `${rightLabel}:`, 9, true);
  addText(420, topY + 10, sanitizeFieldValue(rightValue), 9, false, 'left', 120);
  addLine(PAGE_LEFT + 8, lineY, 300, lineY);
  addLine(392, lineY, PAGE_RIGHT - 8, lineY);
  commands.push('[] 0 d');
}

function sanitizeFieldValue(value: string): string {
  return value ? value : '-';
}

function buildPdfDocument(pageContents: string[]): string {
  const objects: string[] = [];
  const addObject = (body: string): number => {
    objects.push(body);
    return objects.length;
  };

  const fontRegularId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBoldId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pagesObjectId = addObject('');
  const pageIds: number[] = [];

  pageContents.forEach((content) => {
    const stream = `${content}\n`;
    const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesObjectId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    pageIds.push(pageId);
  });

  objects[pagesObjectId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesObjectId} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  objects.forEach((objectBody, index) => {
    offsets[index + 1] = pdf.length;
    pdf += `${index + 1} 0 obj\n${objectBody}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function toPdfY(yFromTop: number): number {
  return PAGE_HEIGHT - yFromTop;
}

function approximateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.52;
}

function fitTextToWidth(text: string, fontSize: number, maxWidth?: number): string {
  if (!maxWidth || approximateTextWidth(text, fontSize) <= maxWidth) {
    return text;
  }

  let trimmed = text;

  while (trimmed.length > 3 && approximateTextWidth(`${trimmed}...`, fontSize) > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }

  return `${trimmed}...`;
}

function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function sanitizePdfText(text: string): string {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .trim();
}

function formatAmount(value: number, decimals = 2): string {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(Number.isFinite(value) ? value : 0);
}

export function mapPedidoReportDisplayDate(value: string): string {
  return formatDisplayDate(value) || '-';
}
