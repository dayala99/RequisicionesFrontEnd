import { formatDisplayDate } from './date.utils';

export interface OrdenCompraReporteDetallePdf {
  item: number;
  cantidad: number;
  unidad: string;
  especificacion: string;
  centroCosto: string;
  precioUnitario: number;
  importe: number;
}

export interface OrdenCompraReportePdfData {
  ordenCompraId: number;
  tipoServicio?: string;
  fecha: string;
  proveedor: string;
  ruc: string;
  cuenta: string;
  cci: string;
  contacto: string;
  email: string;
  direccionProveedor: string;
  referenciaObra: string;
  observaciones: string;
  fechaRequerida: string;
  pedido: string;
  direccionEnvio: string;
  solicitadoPor: string;
  condicionPago: string;
  subtotal: number;
  igv: number;
  total: number;
  totalPagar: number;
  detalle: OrdenCompraReporteDetallePdf[];
}

export interface OrdenCompraReportePdfOptions {
  logoBytes?: Uint8Array;
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_LEFT = 28;
const PAGE_RIGHT = PAGE_WIDTH - 28;
const PAGE_TOP = 28;
const ROW_HEIGHT = 24;
const FIRST_PAGE_ROWS = 10;
const NEXT_PAGE_ROWS = 18;

export function createOrdenCompraReportPdf(report: OrdenCompraReportePdfData, options: OrdenCompraReportePdfOptions = {}): Blob {
  const detailChunks = chunkRows(report.detalle, FIRST_PAGE_ROWS, NEXT_PAGE_ROWS);
  const pageContents = detailChunks.map((chunk, index) =>
    buildPageContent(report, chunk, index + 1, detailChunks.length, !!options.logoBytes)
  );

  return new Blob([buildPdfDocument(pageContents, options.logoBytes)], { type: 'application/pdf' });
}

export function mapOrdenCompraReportDisplayDate(value: string): string {
  return formatDisplayDate(value) || '-';
}

function buildPageContent(
  report: OrdenCompraReportePdfData,
  detailRows: OrdenCompraReporteDetallePdf[],
  pageNumber: number,
  totalPages: number,
  hasLogo: boolean
): string {
  const commands: string[] = ['0.65 w', '0 0 0 RG'];
  const addText = createTextAdder(commands);
  const addLabelValue = createLabelValueAdder(addText);
  const addLine = createLineAdder(commands);
  const addRect = createRectAdder(commands);
  const addImage = createImageAdder(commands);
  const isServicio = isOrdenServicio(report.tipoServicio);
  const documentTitle = isServicio ? 'ORDEN DE SERVICIO' : 'ORDEN DE COMPRA';
  const documentPrefix = isServicio ? 'OS' : 'OC';
  const documentName = isServicio ? 'orden de servicio' : 'orden de compra';

  addRect(PAGE_LEFT, PAGE_TOP, PAGE_RIGHT - PAGE_LEFT, 74);
  if (hasLogo) {
    addImage(PAGE_LEFT + 38, PAGE_TOP + 16, 112, 47);
  } else {
    addText(PAGE_LEFT + 20, PAGE_TOP + 30, 'ARCE', 24, true);
    addText(PAGE_LEFT + 20, PAGE_TOP + 50, 'MONTAJES E INGENIERIA ARCE PERU S.A.C.', 8, true);
  }
  addText(PAGE_RIGHT - 8, PAGE_TOP + 20, 'Calle 3, Nro. 177 - Urb La Grimanesa - CALLAO', 8, false, 'right');
  addText(PAGE_RIGHT - 8, PAGE_TOP + 32, 'Telef: 572-3220 ANEXO 11 - 12', 8, false, 'right');
  addText(PAGE_RIGHT - 8, PAGE_TOP + 44, 'RUC: 20550259221', 8, false, 'right');
  addText(PAGE_RIGHT - 8, PAGE_TOP + 60, `Pagina ${pageNumber} de ${totalPages}`, 7, false, 'right');

  addRect(PAGE_RIGHT - 155, 116, 135, 42);
  addText(PAGE_RIGHT - 87.5, 134, documentTitle, 10, true, 'center');
  addText(PAGE_RIGHT - 87.5, 150, `${documentPrefix}${report.ordenCompraId}`, 11, true, 'center');

  addRect(PAGE_LEFT, 174, PAGE_RIGHT - PAGE_LEFT, 72);
  addLabelValue(PAGE_LEFT + 6, 190, 'FECHA:', report.fecha, 8);
  addLabelValue(PAGE_LEFT + 6, 204, 'PROVEEDOR:', report.proveedor, 8, 250);
  addLabelValue(PAGE_LEFT + 6, 218, 'RUC:', report.ruc, 8);
  addLabelValue(PAGE_LEFT + 6, 232, 'CUENTA:', `${sanitizeValue(report.cuenta)} / CCI: ${sanitizeValue(report.cci)}`, 8, 265);

  addLabelValue(310, 190, 'CONTACTO:', report.contacto, 8, 230);
  addLabelValue(310, 204, 'EMAIL:', report.email, 8, 230);
  addLabelValue(310, 218, 'DIRECCION:', report.direccionProveedor, 8, 230);

  addText(PAGE_LEFT, 278, 'Muy Sres. Nuestros:', 8, true);
  addText(PAGE_LEFT, 302, `Sirvanse suministrarnos los materiales contenidos en la ${documentName}, la misma que pasamos a detallar:`, 8);

  addRect(PAGE_LEFT, 318, PAGE_RIGHT - PAGE_LEFT, 64);
  addLabelValue(PAGE_LEFT + 6, 334, 'REFERENCIA OBRA:', report.referenciaObra, 8, PAGE_RIGHT - PAGE_LEFT - 12);
  addLabelValue(PAGE_LEFT + 6, 350, 'OBSERVACIONES:', report.observaciones, 8, PAGE_RIGHT - PAGE_LEFT - 12);
  addLabelValue(PAGE_LEFT + 6, 366, 'FECHA REQ.:', report.fechaRequerida, 8);

  const tableTop = 398;
  drawDetailTable(commands, addText, addLine, addRect, tableTop, detailRows, pageNumber);
  const tableBottom = tableTop + 24 + Math.max(detailRows.length, 1) * ROW_HEIGHT;
  drawTotals(addText, addLine, addRect, tableBottom + 8, report);

  const infoTop = Math.max(tableBottom + 108, 590);
  addRect(PAGE_LEFT, infoTop, PAGE_RIGHT - PAGE_LEFT, 86);
  addLabelValue(PAGE_LEFT + 6, infoTop + 16, 'PEDIDO:', report.pedido, 8);
  addLabelValue(PAGE_LEFT + 6, infoTop + 32, 'DIRECCION ENVIO:', report.direccionEnvio, 8, PAGE_RIGHT - PAGE_LEFT - 12);
  addLabelValue(PAGE_LEFT + 6, infoTop + 48, 'SOLICITADO POR:', report.solicitadoPor, 8, PAGE_RIGHT - PAGE_LEFT - 12);
  addLabelValue(PAGE_LEFT + 6, infoTop + 64, 'CONDICION PAGO:', report.condicionPago, 8);

  const signatureY = 746;
  addLine(PAGE_LEFT, signatureY, PAGE_LEFT + 130, signatureY);
  addLine((PAGE_LEFT + PAGE_RIGHT) / 2 - 65, signatureY, (PAGE_LEFT + PAGE_RIGHT) / 2 + 65, signatureY);
  addLine(PAGE_RIGHT - 130, signatureY, PAGE_RIGHT, signatureY);
  addText(PAGE_LEFT + 65, signatureY + 18, 'ENTREGADO POR', 8, true, 'center');
  addText((PAGE_LEFT + PAGE_RIGHT) / 2, signatureY + 18, 'RECIBIDO POR', 8, true, 'center');
  addText(PAGE_RIGHT - 65, signatureY + 18, 'V°B° SUPERVISION', 8, true, 'center');
  addText((PAGE_LEFT + PAGE_RIGHT) / 2, 802, `Fecha emision ${formatGeneratedDate(new Date())}`, 7, false, 'center');

  return commands.join('\n');
}

function drawDetailTable(
  commands: string[],
  addText: ReturnType<typeof createTextAdder>,
  addLine: ReturnType<typeof createLineAdder>,
  addRect: ReturnType<typeof createRectAdder>,
  top: number,
  rows: OrdenCompraReporteDetallePdf[],
  pageNumber: number
): void {
  const columns = [PAGE_LEFT, 60, 105, 145, 335, 440, 500, PAGE_RIGHT];
  const headers = ['ITEM', 'CANT.', 'UND.', 'ESPECIFICACION', 'CENTRO COSTO', 'PRECIO U.', 'IMPORTE'];

  addRect(PAGE_LEFT, top, PAGE_RIGHT - PAGE_LEFT, 24);
  columns.slice(1, -1).forEach((x) => addLine(x, top, x, top + 24));
  headers.forEach((header, index) => {
    addText((columns[index] + columns[index + 1]) / 2, top + 15, header, 7, true, 'center');
  });

  let rowY = top + 24;
  const detailRows = rows.length ? rows : [{
    item: 1,
    cantidad: 0,
    unidad: '-',
    especificacion: 'SIN ITEMS REGISTRADOS',
    centroCosto: '-',
    precioUnitario: 0,
    importe: 0
  }];

  detailRows.forEach((row, rowIndex) => {
    addRect(PAGE_LEFT, rowY, PAGE_RIGHT - PAGE_LEFT, ROW_HEIGHT);
    columns.slice(1, -1).forEach((x) => addLine(x, rowY, x, rowY + ROW_HEIGHT));
    const itemNumber = rows.length ? row.item : rowIndex + 1 + (pageNumber - 1) * NEXT_PAGE_ROWS;
    addText((columns[0] + columns[1]) / 2, rowY + 15, String(itemNumber), 7, false, 'center');
    addText(columns[2] - 6, rowY + 15, formatAmount(row.cantidad, 2), 7, false, 'right');
    addText((columns[2] + columns[3]) / 2, rowY + 15, row.unidad, 7, false, 'center', columns[3] - columns[2] - 6);
    addText(columns[3] + 4, rowY + 15, row.especificacion, 7, false, 'left', columns[4] - columns[3] - 8);
    addText(columns[4] + 4, rowY + 15, row.centroCosto, 7, false, 'left', columns[5] - columns[4] - 8);
    addText(columns[6] - 6, rowY + 15, formatAmount(row.precioUnitario, 2), 7, false, 'right');
    addText(columns[7] - 6, rowY + 15, formatAmount(row.importe, 2), 7, false, 'right');
    rowY += ROW_HEIGHT;
  });
}

function drawTotals(
  addText: ReturnType<typeof createTextAdder>,
  addLine: ReturnType<typeof createLineAdder>,
  addRect: ReturnType<typeof createRectAdder>,
  top: number,
  report: OrdenCompraReportePdfData
): void {
  const x = 365;
  const width = PAGE_RIGHT - x;
  const rowHeight = 20;
  const labels = [
    ['SUB TOTAL', report.subtotal],
    ['IGV TOTAL', report.igv],
    ['TOTAL CON IGV', report.total],
    ['TOTAL A PAGAR', report.totalPagar]
  ];

  labels.forEach(([label, value], index) => {
    const y = top + index * rowHeight;
    addRect(x, y, width, rowHeight);
    addLine(x + 92, y, x + 92, y + rowHeight);
    addText(x + 46, y + 13, String(label), 7, true, 'center');
    addText((x + 92 + PAGE_RIGHT) / 2, y + 13, `S/. ${formatAmount(Number(value), 2)}`, 7, true, 'center');
  });
}

function chunkRows(rows: OrdenCompraReporteDetallePdf[], firstPageRows: number, nextPageRows: number): OrdenCompraReporteDetallePdf[][] {
  if (!rows.length) {
    return [[]];
  }

  const chunks: OrdenCompraReporteDetallePdf[][] = [];
  let startIndex = 0;
  let currentSize = firstPageRows;

  while (startIndex < rows.length) {
    chunks.push(rows.slice(startIndex, startIndex + currentSize));
    startIndex += currentSize;
    currentSize = nextPageRows;
  }

  return chunks;
}

function createTextAdder(commands: string[]) {
  return (x: number, y: number, text: string, size = 10, bold = false, align: 'left' | 'center' | 'right' = 'left', maxWidth?: number) => {
    const fittedText = fitTextToWidth(sanitizePdfText(text), size, maxWidth);
    const textWidth = approximateTextWidth(fittedText, size);
    let drawX = x;

    if (align === 'center') {
      drawX = x - textWidth / 2;
    } else if (align === 'right') {
      drawX = x - textWidth;
    }

    commands.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${drawX.toFixed(2)} ${toPdfY(y).toFixed(2)} Td (${escapePdfText(fittedText)}) Tj ET`);
  };
}

function createLabelValueAdder(addText: ReturnType<typeof createTextAdder>) {
  return (x: number, y: number, label: string, value: string, size = 8, maxWidth?: number) => {
    const safeLabel = sanitizePdfText(label);
    const safeValue = sanitizeValue(value);
    const labelWidth = approximateTextWidth(safeLabel, size) + 4;
    addText(x, y, safeLabel, size, true);
    addText(x + labelWidth, y, safeValue, size, false, 'left', maxWidth ? Math.max(maxWidth - labelWidth, 20) : undefined);
  };
}

function createLineAdder(commands: string[]) {
  return (x1: number, y1: number, x2: number, y2: number) => {
    commands.push(`${x1.toFixed(2)} ${toPdfY(y1).toFixed(2)} m ${x2.toFixed(2)} ${toPdfY(y2).toFixed(2)} l S`);
  };
}

function createImageAdder(commands: string[]) {
  return (x: number, y: number, width: number, height: number) => {
    commands.push(`q ${width.toFixed(2)} 0 0 ${height.toFixed(2)} ${x.toFixed(2)} ${toPdfY(y + height).toFixed(2)} cm /Im1 Do Q`);
  };
}

function createRectAdder(commands: string[]) {
  return (x: number, y: number, width: number, height: number) => {
    commands.push(`${x.toFixed(2)} ${toPdfY(y + height).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S`);
  };
}

type PdfObject =
  | { kind: 'text'; body: string }
  | { kind: 'binary'; header: string; bytes: Uint8Array; footer: string };

function buildPdfDocument(pageContents: string[], logoBytes?: Uint8Array): Uint8Array {
  const objects: PdfObject[] = [];
  const addObject = (body: string): number => {
    objects.push({ kind: 'text', body });
    return objects.length;
  };
  const addBinaryObject = (header: string, bytes: Uint8Array, footer: string): number => {
    objects.push({ kind: 'binary', header, bytes, footer });
    return objects.length;
  };

  const fontRegularId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBoldId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const imageId = logoBytes
    ? addBinaryObject(
        `<< /Type /XObject /Subtype /Image /Width 1591 /Height 672 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logoBytes.length} >>\nstream\n`,
        logoBytes,
        '\nendstream'
      )
    : null;
  const pagesObjectId = addObject('');
  const pageIds: number[] = [];
  const resources = imageId
    ? `/Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> /XObject << /Im1 ${imageId} 0 R >> >>`
    : `/Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >>`;

  pageContents.forEach((content) => {
    const stream = `${content}\n`;
    const contentId = addObject(`<< /Length ${byteLength(stream)} >>\nstream\n${stream}endstream`);
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesObjectId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ${resources} /Contents ${contentId} 0 R >>`
    );
    pageIds.push(pageId);
  });

  objects[pagesObjectId - 1] = {
    kind: 'text',
    body: `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`
  };
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesObjectId} 0 R >>`);

  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let currentOffset = 0;
  const appendText = (value: string) => {
    const chunk = encodeText(value);
    chunks.push(chunk);
    currentOffset += chunk.length;
  };
  const appendBytes = (value: Uint8Array) => {
    chunks.push(value);
    currentOffset += value.length;
  };

  appendText('%PDF-1.4\n');
  objects.forEach((objectBody, index) => {
    offsets[index + 1] = currentOffset;
    appendText(`${index + 1} 0 obj\n`);

    if (objectBody.kind === 'text') {
      appendText(`${objectBody.body}\n`);
    } else {
      appendText(objectBody.header);
      appendBytes(objectBody.bytes);
      appendText(`${objectBody.footer}\n`);
    }

    appendText('endobj\n');
  });

  const xrefOffset = currentOffset;
  appendText(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);

  for (let index = 1; index <= objects.length; index += 1) {
    appendText(`${String(offsets[index]).padStart(10, '0')} 00000 n \n`);
  }

  appendText(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return concatBytes(chunks, currentOffset);
}

function toPdfY(yFromTop: number): number {
  return PAGE_HEIGHT - yFromTop;
}

function approximateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.56;
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

function encodeText(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function byteLength(value: string): number {
  return encodeText(value).length;
}

function concatBytes(chunks: Uint8Array[], totalLength: number): Uint8Array {
  const result = new Uint8Array(totalLength);
  let offset = 0;

  chunks.forEach((chunk) => {
    result.set(chunk, offset);
    offset += chunk.length;
  });

  return result;
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

function sanitizeValue(value: string): string {
  return value?.trim() || '-';
}

function formatAmount(value: number, decimals = 2): string {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(Number.isFinite(value) ? value : 0);
}

function formatGeneratedDate(value: Date): string {
  const date = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(value);
  const time = new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(value);

  return `${date}, ${time}`;
}

function isOrdenServicio(value?: string): boolean {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .includes('servicio');
}
