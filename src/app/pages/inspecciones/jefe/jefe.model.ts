export interface JefeItem {
  id: number | null;
  nombre: string;
  dni: string;
  area: string;
  estado: string;
  cenCosId?: number | null;
}

export interface CentroCostoOption {
  id: number;
  descripcion: string;
}

export interface JefeFilter {
  Id?: number;
  Nombre?: string;
  Dni?: string;
  Estado?: string;
}