import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from 'src/app/Services/api.services';
import { CentroCostoOption, JefeFilter } from './jefe.model';

export interface RegistrarJefeRequest {
  Nombre: string;
  Dni: string;
  Cen_Cos_Id: number;
  Usr_Reg: string;
}

export interface ActualizarJefeRequest {
  Id: number;
  Nombre: string;
  Dni: string;
  Cen_Cos_Id: number;
  Estado: string;
  Usr_Mod: string;
}

@Injectable({
  providedIn: 'root'
})
export class JefeService {
  constructor(private readonly apiService: ApiService) {}

  listar(filtros: JefeFilter = {}): Observable<any> {
    return this.apiService.getListarJefe(filtros);
  }

  registrar(jefe: RegistrarJefeRequest): Observable<any> {
    return this.apiService.registrarJefe(jefe as never);
  }

  consultarDatos(jefeId: number): Observable<any> {
    return this.apiService.getConsultarDatosJefe(jefeId);
  }

  actualizar(jefe: ActualizarJefeRequest): Observable<any> {
    return this.apiService.actualizarJefe(jefe as never);
  }

  eliminar(id: number, usrMod: string): Observable<any> {
    return this.apiService.eliminarJefe(id, usrMod);
  }

  listarCentroCostosActivos(): Observable<any> {
    return this.apiService.getListarCentroCostoParaJefe();
  }

  private extractRecords(response: unknown): Record<string, unknown>[] {
    if (Array.isArray(response)) {
      return response.filter((item): item is Record<string, unknown> => this.isRecord(item));
    }

    if (!this.isRecord(response)) {
      return [];
    }

    const elements = response['Elements'] ?? response['elements'];
    if (Array.isArray(elements)) {
      return elements.filter((item): item is Record<string, unknown> => this.isRecord(item));
    }

    const data = response['Data'] ?? response['data'];
    if (Array.isArray(data)) {
      return data.filter((item): item is Record<string, unknown> => this.isRecord(item));
    }

    return [response];
  }

  mapCentroCostoOptions(response: unknown): CentroCostoOption[] {
    return this.extractRecords(response).map((item) => ({
      id: Number(
        item['Cen_Cos_Id'] ?? item['cen_Cos_Id'] ?? item['cen_cos_id'] ?? item['cenCosId'] ?? item['Id'] ?? 0
      ),
      descripcion: String(
        item['Cen_Cos_Des'] ?? item['cen_Cos_Des'] ?? item['cen_cos_des'] ?? item['cenCosDes'] ??
        item['Descripcion'] ?? item['descripcion'] ?? ''
      )
    })).filter((item) => item.id > 0 && !!item.descripcion);
  }

  mapJefeDetalle(response: unknown): { nombre: string; dni: string; cenCosDes: string; estado: string } | null {
    const registros = this.extractRecords(response);
    if (!registros.length) {
      return null;
    }

    const item = registros[0];
    return {
      nombre: String(item['Jef_Nombre'] ?? item['jef_Nombre'] ?? item['jef_nombre'] ?? item['Nombre'] ?? item['nombre'] ?? ''),
      dni: String(item['Jef_DNI'] ?? item['jef_DNI'] ?? item['jef_dni'] ?? item['Dni'] ?? item['dni'] ?? ''),
      cenCosDes: String(item['Cen_Cos_Des'] ?? item['cen_Cos_Des'] ?? item['cen_cos_des'] ?? item['Area'] ?? item['area'] ?? ''),
      estado: String(item['Estado'] ?? item['estado'] ?? '')
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}