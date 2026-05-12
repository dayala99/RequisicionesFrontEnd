export interface PedidoDetalleItemOption {
  id: number;
  code: string;
  description: string;
  groupDescription: string;
}

export interface PedidoDetalleUnidadOption {
  id: number;
  code: string;
  description: string;
  abbreviation: string;
}

export interface PedidoDetalleDialogValue {
  itemCode: string;
  itemDescription: string;
  unitCode: string;
  unitDescription: string;
  quantity: number;
  unitPrice: number;
}
