import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { GlobalVariable } from '../VarGlobals';
import { HttpHeaders } from '@angular/common/http';
import { HttpParams } from '@angular/common/http';

export interface UsuariosFiltro {
    Usr_Id?: number;
    Usr_Cod?: string;
    Usr_Nom?: string;
    Flg_Est?: string;
}

export interface ObtenerAccesoUsuarioFiltro {
    Usr_Cod: string;
    Usr_Pass: string;
}

export interface ConsultaDatosUsuarioFiltro {
    Usr_Cod: string;
}

export interface RegistrarObservacionPlaneadaRequest {
    Usr_Cod: string;
    Cliente_Id: number;
    Subestacion_Id: number;
    SubContrata_Id: number;
    Jefe_Id: number;
    Motivo_Id: number;
    Clima_Id: number;
    Tarea_Id: number;
    Obs_Detalle: string;
    Obs_Actividad: string;
    Usr_Reg: string;
}

export interface ActualizarObservacionPlaneadaRequest {
    Codigo_Obs: string;
    Cliente_Id: number;
    Subestacion_Id: number;
    SubContrata_Id: number;
    Jefe_Id: number;
    Motivo_Id: number;
    Clima_Id: number;
    Tarea_Id: number;
    Obs_Detalle: string;
    Obs_Actividad: string;
    Estado: 'A' | 'I';
    Usr_Mod: string;
}

export interface EliminarObservacionPlaneadaRequest {
    Codigo_Obs: string;
    Usr_Mod: string;
}

export interface ConsultarEstadoObservacionesRequest {
    Estado: 'A' | 'I';
}


export interface ObservacionPlaneadaDetalleResponse {
    Usr_Cod?: string;
    Usr_Crg?: string;
    Usr_Doc_Nro?: string;
    Usr_Nom?: string;
    Cliente_Id?: number;
    Cliente_Nombre?: string;
    Subestacion_Id?: number;
    Subestacion_Nombre?: string;
    SubContrata_Id?: number;
    SubContrata_Nombre?: string;
    Jefe_Id?: number;
    Jef_Nombre?: string;
    Jef_DNI?: string;
    Cen_Cos_Des?: string;
    Motivo_Id?: number;
    Motivo_Nombre?: string;
    Obs_Detalle?: string;
    Clima_Id?: number;
    Clima_Nombre?: string;
    Tarea_Id?: number;
    Tarea_Nombre?: string;
    Obs_Actividad?: string;
}

export interface ProveedoresFiltro {
    Prv_Id?: number;
    Prv_Nom?: string;
    Prv_Ruc?: string;
    Prv_Nom_Con?: string;
    Flg_Est?: string;
}

export interface FormaPagoFiltro {
    For_Pag_Id?: number;
    For_Pag_Des?: string;
    Flg_Est?: string;
}

export interface PerfilFiltro {
    Prf_Cod?: string;
    Prf_Des?: string;
    Flg_Est?: string;
}

export interface CargoFiltro {
    Cargo_Id?: number;
    Cargo_Nombre?: string;
}

export interface RegistrarAccesoRequest {
    Prf_Acc_Cod: string;
    Prf_Acc_Des: string;
    Usr_Reg: string;
}

export interface EliminarAccesoRequest {
    Prf_Acc_Cod: string;
    Prf_Acc_Des: string;
}

export interface AccesoFiltro {
    Prf_Acc_Cod?: string;
}

export interface DetraccionFiltro {
    Det_Id?: number;
    Det_Des?: string;
    Flg_Est?: string;
}

export interface GrupoItemFiltro {
    Grp_Id?: number;
    Grp_Des?: string;
    Flg_Est?: string;
}

export interface SubGrupoItemFiltro {
    Sub_Grp_Cod?: string;
    Sub_Grp_Des?: string;
    Flg_Est?: string;
}

export interface ItemDetalleMaterialFiltro {
    Det_Mat_Cod?: string;
    Det_Mat_Des?: string;
    Grp_Id?: number;
    Sub_Grp_Id?: number;
    Flg_Est?: string;
}

export interface ItemFiltro {
    Itm_Cod?: string;
    Itm_Des?: string;
    Itm_Grp?: number;
    Itm_Sub_Grp?: number;
    Itm_Det_Mat_Id?: number;
    Flg_Est?: string;
}

export interface TipoServicioFiltro {
    Tip_Ser_Id?: number;
    Tip_Ser_Des?: string;
    Flg_Est?: string;
}

export interface UnidadMedidaFiltro {
    Uni_Med_Id?: number;
    Uni_Med_Des?: string;
    Flg_Est?: string;
}

export interface JefeFiltro {
    Id?: number;
    Nombre?: string;
    Dni?: string;
    Estado?: string;
    Fecha?: string;
}

export interface RegistrarJefeRequest {
    Nombre: string;
    Fecha: string;
}

export interface ActualizarJefeRequest {
    Id: number;
    Nombre: string;
    Dni: string;
    Cen_Cos_Id: number;
    Usr_Mod: string;
}

export interface UbicacionFiltro {
    Ubi_Id?: number;
    Ubi_Des?: string;
    Flg_Est?: string;
}

export interface BancoFiltro {
    Ban_Id?: number;
    Ban_Des?: string;
    Flg_Est?: string;
}

export interface MonedaFiltro {
    Mon_Id?: number;
    Mon_Des?: string;
    Flg_Est?: string;
}

export interface RegistrarFormaPagoRequest {
    For_Pag_Des: string;
    Usr_Reg: string;
}

export interface ActualizarFormaPagoRequest {
    For_Pag_Id: number;
    For_Pag_Des: string;
    Flg_Est: string;
    Usr_Mod: string;
}

export interface RegistrarDetraccionRequest {
    Det_Des: string;
    Det_Por: number;
    Usr_Reg: string;
}

export interface ActualizarDetraccionRequest {
    Det_Id: number;
    Det_Des: string;
    Det_Por: number;
    Flg_Est: string;
    Usr_Mod: string;
}

export interface RegistrarCentroCostoRequest {
    Cen_Cos_Des: string;
    Usr_Reg: string;
}

export interface ActualizarCentroCostoRequest {
    Cen_Cos_Id: number;
    Cen_Cos_Des: string;
    Flg_Est: string;
    Usr_Mod: string;
}

export interface RegistrarGrupoItemRequest {
    Grp_Des: string;
    Usr_Reg: string;
}

export interface ActualizarGrupoItemRequest {
    Grp_Id: number;
    Grp_Des: string;
    Flg_Est: string;
    Usr_Mod: string;
}

export interface RegistrarSubGrupoItemRequest {
    Sub_Grp_Des: string;
    Grp_Id: number;
    Usr_Reg: string;
}

export interface ActualizarSubGrupoItemRequest {
    Sub_Grp_Id: number;
    Sub_Grp_Des: string;
    Grp_Id: number;
    Flg_Est: string;
    Usr_Mod: string;
}

export interface RegistrarItemDetalleMaterialRequest {
    Grp_Id: number;
    Sub_Grp_Id: number;
    Det_Mat_Des: string;
    Usr_Reg: string;
}

export interface ActualizarItemDetalleMaterialRequest {
    Det_Mat_Id: number;
    Grp_Id: number;
    Sub_Grp_Id: number;
    Det_Mat_Des: string;
    Flg_Est: string;
    Usr_Mod: string;
}

export interface RegistrarItemRequest {
    Itm_Des: string;
    Itm_Grp: number;
    Itm_Sub_Grp?: number;
    Itm_Det_Mat_Id?: number;
    Uni_Med_Id?: number;
    Usr_Reg: string;
}

export interface ActualizarItemRequest {
    Itm_Id: number;
    Itm_Des: string;
    Itm_Grp: number;
    Itm_Sub_Grp?: number;
    Itm_Det_Mat_Id?: number;
    Uni_Med_Id?: number;
    Flg_Est: string;
    Usr_Mod: string;
}

export interface RegistrarTipoServicioRequest {
    Tip_Ser_Des: string;
    Usr_Reg: string;
}

export interface ActualizarTipoServicioRequest {
    Tip_Ser_Id: number;
    Tip_Ser_Des: string;
    Flg_Est: string;
    Usr_Mod: string;
}

export interface RegistrarUnidadMedidaRequest {
    Uni_Med_Des: string;
    Uni_Med_Abr: string;
    Usr_Reg: string;
}

export interface ActualizarUnidadMedidaRequest {
    Uni_Med_Id: number;
    Uni_Med_Des: string;
    Uni_Med_Abr: string;
    Flg_Est: string;
    Usr_Mod: string;
}

export interface RegistrarBancoRequest {
    Ban_Des: string;
    Ban_Abr: string;
    Usr_Reg: string;
}

export interface ActualizarBancoRequest {
    Ban_Id: number;
    Ban_Des: string;
    Ban_Abr: string;
    Flg_Est: string;
    Usr_Mod: string;
}

export interface RegistrarMonedaRequest {
    Mon_Des: string;
    Mon_Abr: string;
    Usr_Reg: string;
}

export interface ActualizarMonedaRequest {
    Mon_Id: number;
    Mon_Des: string;
    Mon_Abr: string;
    Flg_Est: string;
    Usr_Mod: string;
}

export interface CentroCostoFiltro {
    Cen_Cos_Id?: number;
    Cen_Cos_Des?: string;
    Flg_Est?: string;
}

export interface DireccionEntregaFiltro {
    Dir_Id?: number;
    Dir_Des?: string;
    Flg_Est?: string;
}

export interface RegistrarDireccionEntregaRequest {
    Dir_Des: string;
    Dir_Ubi: string;
    Usr_Reg: string;
}

export interface ActualizarDireccionEntregaRequest {
    Dir_Id: number;
    Dir_Des: string;
    Dir_Ubi: string;
    Flg_Est: string;
    Usr_Mod: string;
}

export interface PedidosFiltro {
    Ped_Id?: number;
    Prv_Nom?: string;
    Flg_Est?: string;
    Ped_Tip_Com?: number;
    Usr_Cod?: string;
}

export interface OrdenCompraFiltro {
    Ord_Com_Id?: number;
    Ord_Com_Prv?: string;
    Flg_Est?: string;
}

export interface AlmacenFiltro {
    Alm_Mov_Id?: number;
    Alm_Tip_Ing?: number;
    Flg_Est?: string;
    Flg_Est_Apr?: string;
}

export interface RegistrarIngresoAlmacenRequest {
    Alm_Ubi: number;
    Alm_Tip_Ing: number;
    Alm_Sol_Dni: string;
    Alm_Cen_Cos: number;
    Usr_Reg: string;
    Flg_Est_Apr?: string;
}

export interface RegistrarIngresoAlmacenOrdenCompraRequest {
    Alm_Ubi: number;
    Alm_Tip_Ing: number;
    Usr_Reg: string;
    Ord_Com_Id: number;
    Ped_Id: number;
}

export interface ActualizarIngresoAlmacenRequest {
    Alm_Mov_Id: number;
    Alm_Ubi: number;
    Alm_Sol_Dni: string;
    Alm_Cen_Cos: number;
    Flg_Est: string;
    Usr_Mod: string;
}

export interface RegistrarIngresoAlmacenDetalleRequest {
    Alm_Mov_Id: number;
    Alm_Det_Itm_Id: number;
    Alm_Det_Uni_Med_Id: number;
    Alm_Det_Can: number;
    Alm_Det_Doc_Nro: string;
    Alm_Det_Fec: string;
    Alm_Det_Cen_Cos_Id: number;
    Alm_Det_Prv_Id: number;
    Usr_Reg: string;
}

export interface ActualizarIngresoAlmacenDetalleRequest {
    Alm_Det_Id: number;
    Alm_Det_Itm_Id: number;
    Alm_Det_Uni_Med_Id: number;
    Alm_Det_Can: number;
    Alm_Det_Doc_Nro: string;
    Alm_Det_Fec: string;
    Alm_Det_Cen_Cos_Id: number;
    Alm_Det_Prv_Id: number;
    Usr_Reg: string;
}

export interface ActualizarPedidoDetalleIngresoAlmacenRequest {
    Ped_Det_Id: number;
    Ord_Com_Id: number;
    Can_Ing: number;
}

export interface ActualizarIngresoAlmacenDetalleOrdenCompraRequest {
    Alm_Det_Id: number;
    Alm_Det_Can: number;
    Usr_Mod: string;
}

export interface ActualizarStockItemRequest {
    Itm_Id: number;
    Ord_Com_Id: number;
    Can_Ing: number;
}

export interface ActualizarStockItemIngresoDirectoRequest {
    Alm_Mov_Id: number;
    Alm_Det_Itm_Id: number;
    Can_Ing: number;
}

export interface ActualizarStockItemSalidaRequest {
    Alm_Mov_Id: number;
    Alm_Det_Itm_Id: number;
    Can_Ing: number;
}

export interface ActualizarMotivoRechazoAlmacenRequest {
    Alm_Mov_Id: number;
    Alm_Mot_Rch: string;
}

export interface CambiarEstadoOrdenCompraRequest {
    Ord_Com_Id: number;
    Flg_Alm: string;
}

export interface CatalogoTextoOption {
    codigo: string;
    descripcion: string;
}

export interface CatalogoNumeroOption {
    codigo: number;
    descripcion: string;
}

export interface ActualizarUsuarioRequest {
    Usr_Id: string;
    Usr_Cod: string;
    Usr_Nom: string;
    Flg_Est: string;
    Usr_Mod: string;
    Usr_Doc_Nro: string;
    Usr_Cen_Cos_Id: number;
    Usr_Pass: string;
    Usr_Apr: string;
    Usr_Corr: string;
    Usr_Prf: string;
    Usr_Crg?: number;
}

export interface RegistrarUsuarioRequest {
    Usr_Id: string;
    Usr_Cod: string;
    Usr_Nom: string;
    Flg_Est: string;
    Usr_Reg: string;
    Fec_Reg: string;
    Usr_Mod: string;
    Fec_Mod: string;
    Usr_Doc_Nro: string;
    Usr_Cen_Cos_Id: number;
    Usr_Pass: string;
    Usr_Apr: string;
    Usr_Corr: string;
    Usr_Prf: string;
    Usr_Crg?: number;
}

export interface RegistrarProveedorRequest {
    Prv_Nom: string;
    Prv_Ruc: string;
    Prv_Tel?: string;
    Prv_Dir: string;
    Prv_Nom_Con?: string;
    Prv_Email?: string;
    Prv_Nro_Cue_Ban?: string;
    Prv_Nro_Cue_Ban_CCI?: string;
    Prv_Ban?: number;
    Usr_Reg: string;
}

export interface ActualizarProveedorRequest {
    Prv_Id: number;
    Prv_Nom: string;
    Prv_Ruc: string;
    Prv_Tel?: string;
    Prv_Dir: string;
    Prv_Nom_Con?: string;
    Prv_Email?: string;
    Prv_Nro_Cue_Ban?: string;
    Prv_Nro_Cue_Ban_CCI?: string;
    Prv_Ban?: number;
    Flg_Est: string;
    Usr_Reg: string;
    Fec_Reg: string;
    Usr_Mod: string;
    Fec_Mod: string;
}

export interface ProveedorBancoFiltro {
    Prv_Ban_Id?: number;
    Prv_Id?: number;
}

export interface RegistrarProveedorBancoRequest {
    Prv_Id: number;
    Ban_Id: number;
    Tip_Mon: number;
    Prv_Ban_Nro_Cta: string;
    Prv_Ban_Nro_Cta_CCI: string;
    Usr_Reg: string;
}

export interface ActualizarProveedorBancoRequest {
    Prv_Ban_Id: number;
    Prv_Id: number;
    Ban_Id: number;
    Tip_Mon: number;
    Prv_Ban_Nro_Cta: string;
    Prv_Ban_Nro_Cta_CCI: string;
    Usr_Mod: string;
}

export interface EliminarProveedorBancoRequest {
    Prv_Ban_Id: number;
    Prv_Id: number;
}

export interface ActualizarCuentaBancariaProveedorRequest {
    Prv_Ban_Id: number;
    Prv_Id: number;
}

export interface RegistrarPedidoRequest {
    Ped_Id: number;
    Ped_Usr_Apr: string;
    Ped_Lug_Ent: number;
    Ped_Ref: string;
    Ped_Ref_Gral: string;
    Ped_Tip_Com: string;
    Ped_Tip_Mon: number;
    Ped_Fec_Ent: string;
    Ped_Sus: string;
    Ped_Arc_Adj_Nom: string;
    Ped_Arc_Adj_Rut: string;
    Ped_Prv_Cod: number;
    Ped_For_Pag_Cod: number;
    Ped_Can_Tot: number;
    Usr_Reg: string;
}

export interface RegistrarArchivoAdjuntoPedidoRequest {
    Ped_Cab_Arc_Id: number;
    Ped_Cab_Id: number;
    Ped_Cab_Arc_Rut?: string;
    Ped_Cab_Arc_Nom?: string;
}

export interface RegistrarArchivoAdjuntoOrdenCompraRequest {
    Ord_Com_Arc_Id: number;
    Ord_Com_Id: number;
    Ord_Com_Arc_Rut?: string;
    Ord_Com_Arc_Nom?: string;
}

export interface ActualizarPedidoRequest {
    Ped_Id: number;
    Ped_Usr_Apr: string;
    Ped_Lug_Ent: number;
    Ped_Ref: string;
    Ped_Ref_Gral: string;
    Ped_Tip_Com: string;
    Ped_Tip_Mon: number;
    Ped_Fec_Ent: string;
    Ped_Sus: string;
    Ped_Arc_Adj_Nom: string;
    Ped_Arc_Adj_Rut: string;
    Ped_Prv_Cod: number;
    Ped_For_Pag_Cod: number;
    Ped_Can_Tot: number;
    Usr_Mod: string;
}

export interface ActualizarPedidoEstadoRequest {
    Ped_Id: number;
    Flg_Est: string;
}

export interface RechazarPedidoRequest {
    Ped_Id: number;
    Ped_Mot_Rch: string;
}

export interface EnviarCorreoRequest {
    Para: string;
    Asunto: string;
    CuerpoHtml?: string;
    CuerpoTexto?: string;
    Copias?: string[];
    CopiasOcultas?: string[];
}

export interface EnviarCorreoPedidoGeneradoRequest {
    Ped_Id: number;
    CorreoDestino?: string;
    UsuarioRegistro?: string;
    Referencia?: string;
    UsuarioAprobacion?: string;
    TipoServicio?: string;
    Productos?: EnviarCorreoPedidoGeneradoProductoRequest[];
}

export interface EnviarCorreoPedidoAprobadoRequest {
    Ped_Id: number;
    CorreoDestino?: string;
    UsuarioRegistro?: string;
    UsuarioAprobacion?: string;
    TipoServicio?: string;
}

export interface EnviarCorreoPedidoRechazadoRequest {
    Ped_Id: number;
    CorreoDestino?: string;
    UsuarioRegistro?: string;
    UsuarioAprobacion?: string;
    TipoServicio?: string;
    MotivoRechazo?: string;
}

export interface EnviarCorreoPedidoGeneradoProductoRequest {
    Item?: number;
    DescripcionProducto?: string;
    DescripcionUnidad?: string;
    CentroCosto?: string;
    Cantidad?: number;
}

export interface ActualizarPedidoDetalleCompletoRequest {
    Ped_Id: number;
}

export interface ActualizarReferenciaGeneralRequest {
    Ped_Id: number;
    Ped_Ref_Gral: string;
}

export interface RegistrarOrdenCompraRequest {
    Ord_Com_Prv: number;
    Ord_Com_For_Pag: number;
    Ord_Com_Ref_Obr: string;
    Ord_Com_Obs: string;
    Ord_Com_Ref: string;
    Ord_Com_Sub_Tot: number;
    Ord_Com_Igv: number;
    Ord_Com_Tot: number;
    Ord_Com_Ped_Id: number;
    Ord_Com_Arc_Adj_Nom?: string;
    Ord_Com_Arc_Adj_Rut?: string;
    Ord_Com_Det_Id?: number;
    Ord_Com_Det_Mon?: number;
    Flg_Igv_Aut?: string;
    Igv_Por?: number;
    Usr_Reg: string;
}

export interface ActualizarOrdenCompraRequest {
    Ord_Com_Id: number;
    Ord_Com_Prv: number;
    Ord_Com_For_Pag: number;
    Ord_Com_Ref_Obr: string;
    Ord_Com_Obs: string;
    Ord_Com_Ref: string;
    Ord_Com_Sub_Tot: number;
    Ord_Com_Igv: number;
    Ord_Com_Tot: number;
    Ord_Com_Ped_Id: number;
    Ord_Com_Arc_Adj_Nom?: string;
    Ord_Com_Arc_Adj_Rut?: string;
    Ord_Com_Det_Id?: number;
    Ord_Com_Det_Mon?: number;
    Flg_Igv_Aut?: string;
    Igv_Por?: number;
    Flg_Est: string;
    Usr_Mod: string;
}

export interface RegistrarCentroCostoPedidoRequest {
    Ped_Id: number;
    Ped_Cen_Cos: string;
    Ped_Can: number;
}

export interface EliminarCentroCostoPedidoRequest {
    Ped_Cen_Cos_Id: number;
}

export interface RegistrarDetallePedidoRequest {
    Ped_Cab_Id: number;
    Ped_Cod_Itm: number;
    Ped_Uni_Med: number;
    Ped_Cen_Cos_Asg: number;
    Ped_Can: number;
    Ped_Cos_Uni: number;
    Ped_Cos_Tot: number;
    Usr_Reg: string;
    Ped_Obs_Ped?: string;
}

export interface ActualizarDetallePedidoRequest {
    Ped_Det_Id: number;
    Ped_Cod_Itm: number;
    Ped_Uni_Med: number;
    Ped_Cen_Cos_Asg: number;
    Ped_Can: number;
    Ped_Cos_Uni: number;
    Ped_Cos_Tot: number;
    Usr_Mod: string;
    Ped_Obs_Ped?: string;
}

export interface EliminarDetallePedidoRequest {
    Ped_Det_Id: number;
}

export interface AsignarOrdenCompraDetallePedidoRequest {
    Ord_Com_Id: number;
    Ped_Det_Id: number;
    Ped_Cos_Uni?: number;
    Ped_Obs?: string;
    Usr_Mod?: string;
}

export interface DesAsignarOrdenCompraDetallePedidoRequest {
    Ord_Com_Id: number;
    Ped_Det_Id: number;
}

// ─── Inspecciones ────────────────────────────────────────────────

export interface InsClienteFiltro {
    Cliente_Id?: number;
}

export interface InsSubEstacionFiltro {
    Cliente_Id: number;
}


@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private apiUrl = 'http://localhost:5218/api/';

    baseUrl = GlobalVariable.baseUrlProcesoTenido;

    Header = new HttpHeaders({
        'Content-type': 'application/json'
    });
    constructor(private http: HttpClient) { }

    getWeatherForecast(): Observable<any> {
        const headers = this.Header;
        return this.http.get(this.baseUrl + 'WeatherForecast/GetWeatherForecast' , {headers});
    }

    getListarUsuarioActivo(filtros: UsuariosFiltro = {}): Observable<any> {
        return this.getUsuariosDesdeRuta('Usuario/getListarUsuarioActivo', filtros);
    }

    getUsuarios(filtros: UsuariosFiltro = {}): Observable<any> {
        return this.getUsuariosDesdeRuta('Usuario/GetUsuarios', filtros);
    }

    getObtenerAccesoUsuario(filtros: ObtenerAccesoUsuarioFiltro): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();
        params = params.append('Usr_Cod', filtros.Usr_Cod);
        params = params.append('Usr_Pass', filtros.Usr_Pass);

        return this.http.get(this.baseUrl + 'Usuario/getObtenerAccesoUsuario', { headers, params });
    }

    getObtenerUsuariosAprobacion(Usr_Apr: string): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();
        params = params.append('Usr_Apr', Usr_Apr);

        return this.http.get(this.baseUrl + 'Usuario/getObtenerUsuariosAprobacion', { headers, params });
    }

    getListarCargo(filtros: CargoFiltro = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();
        const cargoId = filtros.Cargo_Id ?? 0;
        const cargoNombre = filtros.Cargo_Nombre ?? '';

        params = params.append('Cargo_Id', cargoId);
        params = params.append('Cargo_Nombre', cargoNombre);

        return this.http.get(this.baseUrl + 'Cargo/getListarCargo', { headers, params });
    }

    getConsultaDatosUsuario(filtros: ConsultaDatosUsuarioFiltro): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();
        params = params.append('Usr_Cod', filtros.Usr_Cod);

        return this.http.get(this.baseUrl + 'Inspecciones/getConsultaDatosUsuario', { headers, params });
    }

    private getUsuariosDesdeRuta(ruta: string, filtros: UsuariosFiltro): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        if (filtros.Usr_Id !== undefined) {
            params = params.append('Usr_Id', filtros.Usr_Id);
        }

        if (filtros.Usr_Cod) {
            params = params.append('Usr_Cod', filtros.Usr_Cod);
        }

        if (filtros.Usr_Nom) {
            params = params.append('Usr_Nom', filtros.Usr_Nom);
        }

        if (filtros.Flg_Est) {
            params = params.append('Flg_Est', filtros.Flg_Est);
        }

        return this.http.get(this.baseUrl + ruta, { headers, params });
    }

    actualizarUsuario(usuario: ActualizarUsuarioRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'Usuario/patchActualizarUsuario', usuario, { headers });
    }

    registrarUsuario(usuario: RegistrarUsuarioRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'Usuario/postRegistrarUsuario', usuario, { headers });
    }

    getListarProveedorActivo(filtros: ProveedoresFiltro = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        if (filtros.Prv_Id !== undefined) {
            params = params.append('Prv_Id', filtros.Prv_Id);
        }

        if (filtros.Prv_Nom) {
            params = params.append('Prv_Nom', filtros.Prv_Nom);
        }

        if (filtros.Prv_Ruc) {
            params = params.append('Prv_Ruc', filtros.Prv_Ruc);
        }

        if (filtros.Prv_Nom_Con) {
            params = params.append('Prv_Nom_Con', filtros.Prv_Nom_Con);
        }

        if (filtros.Flg_Est) {
            params = params.append('Flg_Est', filtros.Flg_Est);
        }

        return this.http.get(this.baseUrl + 'Proveedor/getListarProveedorActivo', { headers, params });
    }

    getListarFormaPagoActivo(filtros: FormaPagoFiltro = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        if (filtros.For_Pag_Id !== undefined) {
            params = params.append('For_Pag_Id', filtros.For_Pag_Id);
        }

        if (filtros.For_Pag_Des) {
            params = params.append('For_Pag_Des', filtros.For_Pag_Des);
        }

        if (filtros.Flg_Est) {
            params = params.append('Flg_Est', filtros.Flg_Est);
        }

        return this.http.get(this.baseUrl + 'FormaPago/getListarFormaPagoActivo', { headers, params });
    }

    getListarPerfil(filtros: PerfilFiltro = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        params = params.append('Prf_Cod', filtros.Prf_Cod || '__');
        params = params.append('Prf_Des', filtros.Prf_Des || '%');
        params = params.append('Flg_Est', filtros.Flg_Est ?? '');

        return this.http.get(this.baseUrl + 'Perfil/getListarPerfil', { headers, params });
    }

    postRegistrarAcceso(acceso: RegistrarAccesoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'Acceso/postRegistrarAcceso', acceso, { headers });
    }

    deleteEliminarAcceso(acceso: EliminarAccesoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.delete(this.baseUrl + 'Acceso/deleteEliminarAcceso', { headers, body: acceso });
    }

    getListarAcceso(filtros: AccesoFiltro = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        params = params.append('Prf_Acc_Cod', filtros.Prf_Acc_Cod ?? '');

        return this.http.get(this.baseUrl + 'Acceso/getListarAcceso', { headers, params });
    }

    registrarFormaPago(formaPago: RegistrarFormaPagoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'FormaPago/postRegistrarFormaPago', formaPago, { headers });
    }

    actualizarFormaPago(formaPago: ActualizarFormaPagoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'FormaPago/patchActualizarFormaPago', formaPago, { headers });
    }

    getListarDetraccion(filtros: DetraccionFiltro = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        if (filtros.Det_Id !== undefined) {
            params = params.append('Det_Id', filtros.Det_Id);
        }

        if (filtros.Det_Des) {
            params = params.append('Det_Des', filtros.Det_Des);
        }

        if (filtros.Flg_Est) {
            params = params.append('Flg_Est', filtros.Flg_Est);
        }

        return this.http.get(this.baseUrl + 'Detraccion/getListarDetraccion', { headers, params });
    }

    registrarDetraccion(detraccion: RegistrarDetraccionRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'Detraccion/postRegistrarDetraccion', detraccion, { headers });
    }

    actualizarDetraccion(detraccion: ActualizarDetraccionRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'Detraccion/patchActualizarDetraccion', detraccion, { headers });
    }

    getListarBanco(filtros: BancoFiltro = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        if (filtros.Ban_Id !== undefined) {
            params = params.append('Ban_Id', filtros.Ban_Id);
        }

        if (filtros.Ban_Des) {
            params = params.append('Ban_Des', filtros.Ban_Des);
        }

        if (filtros.Flg_Est) {
            params = params.append('Flg_Est', filtros.Flg_Est);
        }

        return this.http.get(this.baseUrl + 'Banco/getListarBanco', { headers, params });
    }

    registrarBanco(banco: RegistrarBancoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'Banco/postRegistrarBanco', banco, { headers });
    }

    actualizarBanco(banco: ActualizarBancoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'Banco/patchActualizarBanco', banco, { headers });
    }

    getListarMoneda(filtros: MonedaFiltro = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        if (filtros.Mon_Id !== undefined) {
            params = params.append('Mon_Id', filtros.Mon_Id);
        }

        if (filtros.Mon_Des) {
            params = params.append('Mon_Des', filtros.Mon_Des);
        }

        if (filtros.Flg_Est) {
            params = params.append('Flg_Est', filtros.Flg_Est);
        }

        return this.http.get(this.baseUrl + 'Moneda/getListarMoneda', { headers, params });
    }

    registrarMoneda(moneda: RegistrarMonedaRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'Moneda/postRegistrarMoneda', moneda, { headers });
    }

    actualizarMoneda(moneda: ActualizarMonedaRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'Moneda/patchActualizarMoneda', moneda, { headers });
    }

    getListarGrupoItem(filtros: GrupoItemFiltro = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        if (filtros.Grp_Id !== undefined) {
            params = params.append('Grp_Id', filtros.Grp_Id);
        }

        if (filtros.Grp_Des) {
            params = params.append('Grp_Des', filtros.Grp_Des);
        }

        if (filtros.Flg_Est) {
            params = params.append('Flg_Est', filtros.Flg_Est);
        }

        return this.http.get(this.baseUrl + 'GrupoItem/getListarGrupoItem', { headers, params });
    }

    registrarGrupoItem(grupoItem: RegistrarGrupoItemRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'GrupoItem/postRegistrarGrupoItem', grupoItem, { headers });
    }

    actualizarGrupoItem(grupoItem: ActualizarGrupoItemRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'GrupoItem/patchActualizarGrupoItem', grupoItem, { headers });
    }

    getListarSubGrupoItem(filtros: SubGrupoItemFiltro = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        if (filtros.Sub_Grp_Cod) {
            params = params.append('Sub_Grp_Cod', filtros.Sub_Grp_Cod);
        }

        if (filtros.Sub_Grp_Des) {
            params = params.append('Sub_Grp_Des', filtros.Sub_Grp_Des);
        }

        if (filtros.Flg_Est) {
            params = params.append('Flg_Est', filtros.Flg_Est);
        }

        return this.http.get(this.baseUrl + 'SubGrupoItem/getListarSubGrupoItem', { headers, params });
    }

    getListarSubGrupoItemPorGrpId(grpId: number): Observable<any> {
        const headers = this.Header;
        const params = new HttpParams().set('Grp_Id', String(grpId));
        return this.http.get(this.baseUrl + 'SubGrupoItem/getListarSubGrupoItemPorGrpId', { headers, params });
    }

    registrarSubGrupoItem(subGrupoItem: RegistrarSubGrupoItemRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'SubGrupoItem/postRegistrarSubGrupoItem', subGrupoItem, { headers });
    }

    actualizarSubGrupoItem(subGrupoItem: ActualizarSubGrupoItemRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'SubGrupoItem/patchActualizarSubGrupoItem', subGrupoItem, { headers });
    }

    getListarItemDetalleMaterial(filtros: ItemDetalleMaterialFiltro = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        Object.entries(filtros).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                params = params.append(key, String(value));
            }
        });

        return this.http.get(this.baseUrl + 'ItemDetalleMaterial/getListarItemDetalleMaterial', { headers, params });
    }

    getItemDetalleMaterialEntity(grpId: number, subGrpId: number): Observable<any> {
        const params = new HttpParams()
            .set('Grp_Id', String(grpId))
            .set('Sub_Grp_Id', String(subGrpId));
        return this.http.get(this.baseUrl + 'ItemDetalleMaterial/getListarItemDetalleMaterialPorGrupoySubgrupo', { headers: this.Header, params });
    }

    registrarItemDetalleMaterial(detalle: RegistrarItemDetalleMaterialRequest): Observable<any> {
        return this.http.post(this.baseUrl + 'ItemDetalleMaterial/postRegistrarItemDetalleMaterial', detalle, { headers: this.Header });
    }

    actualizarItemDetalleMaterial(detalle: ActualizarItemDetalleMaterialRequest): Observable<any> {
        return this.http.patch(this.baseUrl + 'ItemDetalleMaterial/patchActualizarItemDetalleMaterial', detalle, { headers: this.Header });
    }

    getListarItem(filtros: ItemFiltro = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        if (filtros.Itm_Cod) {
            params = params.append('Itm_Cod', filtros.Itm_Cod);
        }

        if (filtros.Itm_Des) {
            params = params.append('Itm_Des', filtros.Itm_Des);
        }

        if (filtros.Itm_Grp !== undefined) {
            params = params.append('Itm_Grp', filtros.Itm_Grp);
        }

        if (filtros.Itm_Sub_Grp !== undefined) {
            params = params.append('Itm_Sub_Grp', filtros.Itm_Sub_Grp);
        }

        if (filtros.Itm_Det_Mat_Id !== undefined) {
            params = params.append('Itm_Det_Mat_Id', filtros.Itm_Det_Mat_Id);
        }

        if (filtros.Flg_Est) {
            params = params.append('Flg_Est', filtros.Flg_Est);
        }

        return this.http.get(this.baseUrl + 'Item/getListarItem', { headers, params });
    }

    getListarStocksItems(Usr_Cen_Cos_Id: number, Alm_Det_Itm_Id: number): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();
        params = params.append('Usr_Cen_Cos_Id', String(Usr_Cen_Cos_Id));
        params = params.append('Alm_Det_Itm_Id', String(Alm_Det_Itm_Id));
        return this.http.get(this.baseUrl + 'Item/getListarStocksItems', { headers, params });
    }

    registrarItem(item: RegistrarItemRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'Item/postRegistrarItem', item, { headers });
    }

    actualizarItem(item: ActualizarItemRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'Item/patchActualizarItem', item, { headers });
    }

    getListarTipoServicioActivo(filtros: TipoServicioFiltro = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        if (filtros.Tip_Ser_Id !== undefined) {
            params = params.append('Tip_Ser_Id', filtros.Tip_Ser_Id);
        }

        if (filtros.Tip_Ser_Des) {
            params = params.append('Tip_Ser_Des', filtros.Tip_Ser_Des);
        }

        if (filtros.Flg_Est) {
            params = params.append('Flg_Est', filtros.Flg_Est);
        }

        return this.http.get(this.baseUrl + 'TipoServicio/getListarTipoServicioActivo', { headers, params });
    }

    registrarTipoServicio(tipoServicio: RegistrarTipoServicioRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'TipoServicio/postRegistrarTipoServicio', tipoServicio, { headers });
    }

    actualizarTipoServicio(tipoServicio: ActualizarTipoServicioRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'TipoServicio/patchActualizarTipoServicio', tipoServicio, { headers });
    }

    getListarUnidadMedida(filtros: UnidadMedidaFiltro = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        if (filtros.Uni_Med_Id !== undefined) {
            params = params.append('Uni_Med_Id', filtros.Uni_Med_Id);
        }

        if (filtros.Uni_Med_Des) {
            params = params.append('Uni_Med_Des', filtros.Uni_Med_Des);
        }

        if (filtros.Flg_Est) {
            params = params.append('Flg_Est', filtros.Flg_Est);
        }

        return this.http.get(this.baseUrl + 'UnidadMedida/getListarUnidadMedida', { headers, params });
    }

    registrarUnidadMedida(unidadMedida: RegistrarUnidadMedidaRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'UnidadMedida/postRegistrarUnidadMedida', unidadMedida, { headers });
    }

    actualizarUnidadMedida(unidadMedida: ActualizarUnidadMedidaRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'UnidadMedida/patchActualizarUnidadMedida', unidadMedida, { headers });
    }

    getListarJefe(filtros: JefeFiltro = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        if (filtros.Id !== undefined) {
            params = params.append('Id', filtros.Id);
        }

        if (filtros.Nombre) {
            params = params.append('Nombre', filtros.Nombre);
        }

        if (filtros.Dni) {
            params = params.append('Dni', filtros.Dni);
        }

        if (filtros.Estado) {
            params = params.append('Estado', filtros.Estado);
        }

        if (filtros.Fecha) {
            params = params.append('Fecha', filtros.Fecha);
        }

        return this.http.get(this.baseUrl + 'Jefe/getListarJefe', { headers, params });
    }

    getConsultarDatosJefe(jefeId: number): Observable<any> {
        const headers = this.Header;
        const params = new HttpParams().append('Jefe_Id', jefeId);
        return this.http.get(this.baseUrl + 'Jefe/getConsultarDatosJefe', { headers, params });
    }

    registrarJefe(jefe: RegistrarJefeRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'Jefe/postRegistrarJefe', jefe, { headers });
    }

    actualizarJefe(jefe: ActualizarJefeRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'Jefe/patchActualizarJefe', jefe, { headers });
    }

    eliminarJefe(id: number, usrMod: string): Observable<any> {
        const headers = this.Header;
        const params = new HttpParams().append('Usr_Mod', usrMod);
        return this.http.delete(this.baseUrl + `Jefe/deleteEliminarJefe/${id}`, { headers, params });
    }

    getListarCliente(filtros: { Id?: number; Nombre?: string; Estado?: string } = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        if (filtros.Id !== undefined) {
            params = params.append('Id', filtros.Id);
        }

        if (filtros.Nombre) {
            params = params.append('Nombre', filtros.Nombre);
        }

        if (filtros.Estado) {
            params = params.append('Estado', filtros.Estado);
        }

        return this.http.get(this.baseUrl + 'Cliente/getListarCliente', { headers, params });
    }

    getConsultarDatosCliente(clienteId: number): Observable<any> {
        const headers = this.Header;
        const params = new HttpParams().append('Cliente_Id', clienteId);
        return this.http.get(this.baseUrl + 'Cliente/getConsultarDatosCliente', { headers, params });
    }

    registrarCliente(cliente: { Nombre: string; Usr_Reg: string }): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'Cliente/postRegistrarCliente', cliente, { headers });
    }

    actualizarCliente(cliente: { Id: number; Nombre: string; Estado: string; Usr_Mod: string }): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'Cliente/patchActualizarCliente', cliente, { headers });
    }

    eliminarCliente(id: number, usrMod: string): Observable<any> {
        const headers = this.Header;
        const params = new HttpParams().append('Usr_Mod', usrMod);
        return this.http.delete(this.baseUrl + `Cliente/deleteEliminarCliente/${id}`, { headers, params });
    }

    getListarUbicacionActivo(filtros: UbicacionFiltro = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        if (filtros.Ubi_Id !== undefined) {
            params = params.append('Ubi_Id', filtros.Ubi_Id);
        }

        if (filtros.Ubi_Des) {
            params = params.append('Ubi_Des', filtros.Ubi_Des);
        }

        if (filtros.Flg_Est) {
            params = params.append('Flg_Est', filtros.Flg_Est);
        }

        return this.http.get(this.baseUrl + 'Ubicacion/getListarUbicacionActivo', { headers, params });
    }

    getListarCentroCostoActivo(filtros: CentroCostoFiltro = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        if (filtros.Cen_Cos_Id !== undefined) {
            params = params.append('Cen_Cos_Id', filtros.Cen_Cos_Id);
        }

        if (filtros.Cen_Cos_Des) {
            params = params.append('Cen_Cos_Des', filtros.Cen_Cos_Des);
        }

        if (filtros.Flg_Est) {
            params = params.append('Flg_Est', filtros.Flg_Est);
        }

        return this.http.get(this.baseUrl + 'CentroCosto/getListarCentroCostoActivo', { headers, params });
    }

    getListarCentroCostoParaJefe(): Observable<any> {
        const headers = this.Header;
        return this.http.get(this.baseUrl + 'CentroCosto/getListarCentroCostoParaJefe', { headers });
    }

    registrarCentroCosto(centroCosto: RegistrarCentroCostoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'CentroCosto/postRegistrarCentroCosto', centroCosto, { headers });
    }

    actualizarCentroCosto(centroCosto: ActualizarCentroCostoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'CentroCosto/patchActualizarCentroCosto', centroCosto, { headers });
    }

    getListarDireccionEntregaActivo(filtros: DireccionEntregaFiltro = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        if (filtros.Dir_Id !== undefined) {
            params = params.append('Dir_Id', filtros.Dir_Id);
        }

        if (filtros.Dir_Des) {
            params = params.append('Dir_Des', filtros.Dir_Des);
        }

        if (filtros.Flg_Est) {
            params = params.append('Flg_Est', filtros.Flg_Est);
        }

        return this.http.get(this.baseUrl + 'DireccionEntrega/getListarDireccionEntregaActivo', { headers, params });
    }

    registrarDireccionEntrega(direccionEntrega: RegistrarDireccionEntregaRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'DireccionEntrega/postRegistrarDireccionEntrega', direccionEntrega, { headers });
    }

    actualizarDireccionEntrega(direccionEntrega: ActualizarDireccionEntregaRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'DireccionEntrega/patchActualizarDireccionEntrega', direccionEntrega, { headers });
    }

    getListarPedido(filtros: PedidosFiltro = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        if (filtros.Ped_Id !== undefined) {
            params = params.append('Ped_Id', filtros.Ped_Id);
        }

        if (filtros.Prv_Nom) {
            params = params.append('Prv_Nom', filtros.Prv_Nom);
        }

        if (filtros.Flg_Est) {
            params = params.append('Flg_Est', filtros.Flg_Est);
        }

        if (filtros.Ped_Tip_Com !== undefined) {
            params = params.append('Ped_Tip_Com', filtros.Ped_Tip_Com);
        }

        if (filtros.Usr_Cod) {
            params = params.append('Usr_Cod', filtros.Usr_Cod);
        }

        return this.http.get(this.baseUrl + 'Pedido/getListarPedido', { headers, params });
    }

    getListarPedidoAprobadoParaOC(filtros: PedidosFiltro = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        if (filtros.Ped_Id !== undefined) {
            params = params.append('Ped_Id', filtros.Ped_Id);
        }

        if (filtros.Prv_Nom) {
            params = params.append('Prv_Nom', filtros.Prv_Nom);
        }

        if (filtros.Flg_Est) {
            params = params.append('Flg_Est', filtros.Flg_Est);
        }

        if (filtros.Ped_Tip_Com !== undefined) {
            params = params.append('Ped_Tip_Com', filtros.Ped_Tip_Com);
        }

        return this.http.get(this.baseUrl + 'Pedido/getListarPedidoAprobadoParaOC', { headers, params });
    }

    getListarOrdenCompraActivo(filtros: OrdenCompraFiltro = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        if (filtros.Ord_Com_Id !== undefined) {
            params = params.append('Ord_Com_Id', filtros.Ord_Com_Id);
        }

        if (filtros.Ord_Com_Prv) {
            params = params.append('Ord_Com_Prv', filtros.Ord_Com_Prv);
        }

        if (filtros.Flg_Est) {
            params = params.append('Flg_Est', filtros.Flg_Est);
        }

        return this.http.get(this.baseUrl + 'OrdenCompra/getListarOrdenCompraActivo', { headers, params });
    }

    getListarOrdenCompraPendienteAlmacen(filtros: OrdenCompraFiltro = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        if (filtros.Ord_Com_Id !== undefined) {
            params = params.append('Ord_Com_Id', filtros.Ord_Com_Id);
        }

        if (filtros.Ord_Com_Prv) {
            params = params.append('Ord_Com_Prv', filtros.Ord_Com_Prv);
        }

        if (filtros.Flg_Est) {
            params = params.append('Flg_Est', filtros.Flg_Est);
        }

        return this.http.get(this.baseUrl + 'OrdenCompra/getListarOrdenCompraPendienteAlmacen', { headers, params });
    }

    getListarCabeceraIngresoAlmacen(Ord_Com_Id: number): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();
        params = params.append('Ord_Com_Id', Ord_Com_Id);
        return this.http.get(this.baseUrl + 'OrdenCompra/getListarCabeceraIngresoAlmacen', { headers, params });
    }

    getListarOrdenCompraModificar(Ord_Com_Id: number): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();
        params = params.append('Ord_Com_Id', Ord_Com_Id);
        return this.http.get(this.baseUrl + 'OrdenCompra/getListarOrdenCompraModificar', { headers, params });
    }

    patchCambiarEstadoOrdenCompra(ordenCompra: CambiarEstadoOrdenCompraRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'OrdenCompra/patchCambiarEstadoOrdenCompra', ordenCompra, { headers });
    }

    getListarIngresoAlmacen(filtros: AlmacenFiltro = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        if (filtros.Alm_Mov_Id !== undefined) {
            params = params.append('Alm_Mov_Id', filtros.Alm_Mov_Id);
        }

        if (filtros.Alm_Tip_Ing !== undefined) {
            params = params.append('Alm_Tip_Ing', filtros.Alm_Tip_Ing);
        }

        if (filtros.Flg_Est) {
            params = params.append('Flg_Est', filtros.Flg_Est);
        }

        if (filtros.Flg_Est_Apr) {
            params = params.append('Flg_Est_Apr', filtros.Flg_Est_Apr);
        }

        return this.http.get(this.baseUrl + 'Almacen/getListarIngresoAlmacen', { headers, params });
    }

    getListarIngresoAlmacenModificar(Alm_Mov_Id: number): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();
        params = params.append('Alm_Mov_Id', Alm_Mov_Id);
        return this.http.get(this.baseUrl + 'Almacen/getListarIngresoAlmacenModificar', { headers, params });
    }

    getListarIngresoAlmacenDetalleModificar(Alm_Mov_Id: number): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();
        params = params.append('Alm_Mov_Id', Alm_Mov_Id);
        return this.http.get(this.baseUrl + 'Almacen/getListarIngresoAlmacenDetalleModificar', { headers, params });
    }

    postRegistrarIngresoAlmacen(almacen: RegistrarIngresoAlmacenRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'Almacen/postRegistrarIngresoAlmacen', almacen, { headers });
    }

    postRegistrarIngresoAlmacenOrdenCompra(almacen: RegistrarIngresoAlmacenOrdenCompraRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'Almacen/postRegistrarIngresoAlmacenOrdenCompra', almacen, { headers });
    }

    patchActualizarIngresoAlmacen(almacen: ActualizarIngresoAlmacenRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'Almacen/patchActualizarIngresoAlmacen', almacen, { headers });
    }

    postRegistrarIngresoAlmacenDetalle(detalle: RegistrarIngresoAlmacenDetalleRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'Almacen/postRegistrarIngresoAlmacenDetalle', detalle, { headers });
    }

    patchActualizarIngresoAlmacenDetalle(detalle: ActualizarIngresoAlmacenDetalleRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'Almacen/patchActualizarIngresoAlmacenDetalle', detalle, { headers });
    }

    patchActualizarIngresoAlmacenDetalleOrdenCompra(detalle: ActualizarIngresoAlmacenDetalleOrdenCompraRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'Almacen/patchActualizarIngresoAlmacenDetalleOrdenCompra', detalle, { headers });
    }

    getListarPedidoCorrelativoNuevo(): Observable<any> {
        const headers = this.Header;
        return this.http.get(this.baseUrl + 'Pedido/getListarPedidoCorrelativoNuevo', { headers });
    }

    getListarPedidoModificar(Ped_Id: number): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();
        params = params.append('Ped_Id', Ped_Id);
        return this.http.get(this.baseUrl + 'Pedido/getListarPedidoModificar', { headers, params });
    }

    getListarPedidoRegistradoCentroCosto(Ped_Id: number): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();
        params = params.append('Ped_Id', Ped_Id);
        return this.http.get(this.baseUrl + 'Pedido/getListarPedidoRegistradoCentroCosto', { headers, params });
    }

    getListarDetallePedido(Ped_Cab_Id: number): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();
        params = params.append('Ped_Cab_Id', Ped_Cab_Id);
        return this.http.get(this.baseUrl + 'Pedido/getListarDetallePedido', { headers, params });
    }

    getListarDetalleIngresoAlmacen(Ped_Cab_Id: number, Ord_Com_Id: number): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();
        params = params.append('Ped_Cab_Id', Ped_Cab_Id);
        params = params.append('Ord_Com_Id', Ord_Com_Id);
        return this.http.get(this.baseUrl + 'Pedido/getListarDetalleIngresoAlmacen', { headers, params });
    }

    patchActualizarPedidoDetalleIngresoAlmacen(detalle: ActualizarPedidoDetalleIngresoAlmacenRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'Pedido/patchActualizarPedidoDetalleIngresoAlmacen', detalle, { headers });
    }

    patchActualizarStockItem(item: ActualizarStockItemRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'Item/patchActualizarStockItem', item, { headers });
    }

    patchActualizarStockItemIngresoDirecto(item: ActualizarStockItemIngresoDirectoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'Item/patchActualizarStockItemIngresoDirecto', item, { headers });
    }

    patchActualizarStockItemSalida(item: ActualizarStockItemSalidaRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'Item/patchActualizarStockItemSalida', item, { headers });
    }

    patchActualizarMotivoRechazoAlmacen(item: ActualizarMotivoRechazoAlmacenRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'Almacen/patchActualizarMotivoRechazoAlmacen', item, { headers });
    }

    getListarItemsAsignadosPedidoCentroCosto(Ped_Cab_Id: number): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();
        params = params.append('Ped_Cab_Id', Ped_Cab_Id);
        return this.http.get(this.baseUrl + 'Pedido/getListarItemsAsignadosPedidoCentroCosto', { headers, params });
    }

    getListarItemsAsignadosPedidoCentroCostoModificar(Ord_Com_Id: number, Ped_Cab_Id: number): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();
        params = params.append('Ord_Com_Id', Ord_Com_Id);
        params = params.append('Ped_Cab_Id', Ped_Cab_Id);
        return this.http.get(this.baseUrl + 'Pedido/getListarItemsAsignadosPedidoCentroCostoModificar', { headers, params });
    }

    getListarDetallePedidoModificar(Ped_Det_Id: number): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();
        params = params.append('Ped_Det_Id', Ped_Det_Id);
        return this.http.get(this.baseUrl + 'Pedido/getListarDetallePedidoModificar', { headers, params });
    }

    getCargarReportePedido(Ped_Id: string): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();
        params = params.append('Ped_Id', Ped_Id);
        return this.http.get(this.baseUrl + 'Pedido/getCargarReportePedido', { headers, params });
    }

    getArchivoPedido(nombreArchivo: string): Observable<ArrayBuffer> {
        let params = new HttpParams().set('nombreArchivo', nombreArchivo);
        return this.http.get(this.baseUrl + 'Pedido/getArchivoPedido', { params, responseType: 'arraybuffer' });
    }

    getListarArchivosAdjuntos(Ped_Cab_Id: number): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();
        params = params.append('Ped_Cab_Id', Ped_Cab_Id);
        return this.http.get(this.baseUrl + 'Pedido/getListarArchivosAdjuntos', { headers, params });
    }

    getArchivoOrdenCompra(nombreArchivo: string): Observable<ArrayBuffer> {
        let params = new HttpParams().set('nombreArchivo', nombreArchivo);
        return this.http.get(this.baseUrl + 'OrdenCompra/getArchivoOrdenCompra', { params, responseType: 'arraybuffer' });
    }

    // postRegistrarPedido(pedido: RegistrarPedidoRequest): Observable<any> {
    //     const headers = this.Header;
    //     return this.http.post(this.baseUrl + 'Pedido/postRegistrarPedido', pedido, { headers });
    // }

    postRegistrarPedido(formData: FormData): Observable<any> {
    return this.http.post(this.baseUrl + 'Pedido/postRegistrarPedido', formData);
    }

    postRegistrarArchivoAdjuntoPedido(archivoAdjunto: RegistrarArchivoAdjuntoPedidoRequest, archivo: File): Observable<any> {
        const formData = new FormData();

        Object.entries(archivoAdjunto).forEach(([key, value]) => {
            if (value === null || value === undefined) {
                return;
            }

            formData.append(key, String(value));
        });

        formData.append('archivo', archivo, archivo.name);

        return this.http.post(this.baseUrl + 'Pedido/postRegistrarArchivoAdjunto', formData);
    }

    getListarArchivosAdjuntosOrdenCompra(Ord_Com_Id: number): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();
        params = params.append('Ped_Cab_Id', Ord_Com_Id);
        return this.http.get(this.baseUrl + 'OrdenCompra/getListarArchivosAdjuntosOrdenCompra', { headers, params });
    }

    postRegistrarArchivoAdjuntoOrdenCompra(archivoAdjunto: RegistrarArchivoAdjuntoOrdenCompraRequest, archivo: File): Observable<any> {
        const formData = new FormData();

        Object.entries(archivoAdjunto).forEach(([key, value]) => {
            if (value === null || value === undefined) {
                return;
            }

            formData.append(key, String(value));
        });

        formData.append('archivo', archivo, archivo.name);

        return this.http.post(this.baseUrl + 'OrdenCompra/postRegistrarArchivoAdjuntoOrdenCompra', formData);
    }

    deleteEliminarArchivoAdjuntoOrdenCompra(archivoAdjunto: RegistrarArchivoAdjuntoOrdenCompraRequest): Observable<any> {
        const headers = this.Header;
        return this.http.delete(this.baseUrl + 'OrdenCompra/deleteEliminarArchivoAdjuntoOrdenCompra', {
            headers,
            body: archivoAdjunto
        });
    }

    postEnviarCorreo(correo: EnviarCorreoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'EnviarCorreo/postEnviarCorreo', correo, { headers });
    }

    postEnviarCorreoPedidoGenerado(correo: EnviarCorreoPedidoGeneradoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'EnviarCorreo/postEnviarCorreoPedidoGenerado', correo, { headers });
    }

    postEnviarCorreoPedidoAprobado(correo: EnviarCorreoPedidoAprobadoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'EnviarCorreo/postEnviarCorreoPedidoAprobado', correo, { headers });
    }

    postEnviarCorreoPedidoRechazado(correo: EnviarCorreoPedidoRechazadoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'EnviarCorreo/postEnviarCorreoPedidoRechazado', correo, { headers });
    }

    patchActualizarPedido(pedido: ActualizarPedidoRequest, archivo?: File | null): Observable<any> {
        const formData = new FormData();

        Object.entries(pedido).forEach(([key, value]) => {
            if (value === null || value === undefined) {
                return;
            }

            formData.append(key, String(value));
        });

        if (archivo) {
            formData.append('archivo', archivo, archivo.name);
        } else {
            const nombreArchivoActual = pedido.Ped_Arc_Adj_Nom || 'sin-archivo-adjunto.txt';
            formData.append('archivo', new File([], nombreArchivoActual), nombreArchivoActual);
        }

        return this.http.patch(this.baseUrl + 'Pedido/patchActualizarPedido', formData);
    }

    postRegistrarOrdenCompra(ordenCompra: RegistrarOrdenCompraRequest, archivo?: File | null): Observable<any> {
        const formData = new FormData();

        Object.entries(ordenCompra).forEach(([key, value]) => {
            if (value === null || value === undefined) {
                return;
            }

            formData.append(key, this.formatOrdenCompraFormValue(key, value));
        });

        if (archivo) {
            formData.append('archivo', archivo, archivo.name);
        } else {
            formData.append('archivo', new File([], 'sin-archivo-adjunto.txt'), 'sin-archivo-adjunto.txt');
        }

        return this.http.post(this.baseUrl + 'OrdenCompra/postRegistrarOrdenCompra', formData);
    }

    patchActualizarOrdenCompra(ordenCompra: ActualizarOrdenCompraRequest, archivo?: File | null): Observable<any> {
        const formData = new FormData();

        Object.entries(ordenCompra).forEach(([key, value]) => {
            if (value === null || value === undefined) {
                return;
            }

            formData.append(key, this.formatOrdenCompraFormValue(key, value));
        });

        if (archivo) {
            formData.append('archivo', archivo, archivo.name);
        } else {
            const nombreArchivoActual = ordenCompra.Ord_Com_Arc_Adj_Nom || 'archivo-adjunto';
            formData.append('archivo', new File([], nombreArchivoActual), nombreArchivoActual);
        }

        const formDataDebug: Array<{ key: string; value: unknown }> = [];
        formData.forEach((value, key) => {
            formDataDebug.push({ key, value });
        });
        console.log('PATCH OrdenCompra FormData:', formDataDebug);

        return this.http.patch(this.baseUrl + 'OrdenCompra/patchActualizarOdenCompra', formData);
    }

    private formatOrdenCompraFormValue(key: string, value: unknown): string {
        const decimalKeys = new Set([
            'Ord_Com_Sub_Tot',
            'Ord_Com_Igv',
            'Ord_Com_Tot',
            'Ord_Com_Det_Mon',
            'Igv_Por'
        ]);

        if (decimalKeys.has(key)) {
            return this.formatDecimalForFormData(value);
        }

        return String(value);
    }

    private formatDecimalForFormData(value: unknown): string {
        if (typeof value === 'number') {
            return Number.isFinite(value) ? value.toFixed(2).replace('.', ',') : '0,00';
        }

        const rawValue = String(value ?? '').trim();

        if (!rawValue) {
            return '0,00';
        }

        const normalizedValue = rawValue.includes(',')
            ? rawValue.replace(/\./g, '').replace(',', '.')
            : rawValue.replace(/,/g, '');
        const numericValue = Number(normalizedValue);

        return Number.isFinite(numericValue) ? numericValue.toFixed(2).replace('.', ',') : '0,00';
    }

    patchAsignarOrdenCompraADetallePedido(detalle: AsignarOrdenCompraDetallePedidoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'OrdenCompra/patchAsignarOrdenCompraADetallePedido', detalle, { headers }).pipe(
            // Algunos backends exponen esta actualizacion en el controller de Pedido.
            catchError(() => this.http.patch(this.baseUrl + 'Pedido/patchAsignarOrdenCompraADetallePedido', detalle, { headers }))
        );
    }

    patchDesAsignarOrdenCompraADetallePedido(detalle: DesAsignarOrdenCompraDetallePedidoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'OrdenCompra/patchDesAsignarOrdenCompraADetallePedido', detalle, { headers }).pipe(
            catchError(() => this.http.patch(this.baseUrl + 'Pedido/patchDesAsignarOrdenCompraADetallePedido', detalle, { headers }))
        );
    }

    patchActualizarPedidoEstado(pedido: ActualizarPedidoEstadoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'Pedido/patchActualizarPedidoEstado', pedido, { headers });
    }

    patchRechazarPedido(pedido: RechazarPedidoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'Pedido/patchRechazarPedido', pedido, { headers });
    }

    patchActualizarPedidoCuandoDetalleCompleto(pedido: ActualizarPedidoDetalleCompletoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'Pedido/patchActualizarPedidoCuandoDetalleCompleto', pedido, { headers });
    }

    patchActualizarReferenciaGeneral(pedido: ActualizarReferenciaGeneralRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'Pedido/patchActualizarReferenciaGeneral', pedido, { headers });
    }

    postRegistrarDetallePedido(detalle: RegistrarDetallePedidoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'Pedido/postRegistrarDetallePedido', detalle, { headers });
    }

    patchActualizarDetallePedido(detalle: ActualizarDetallePedidoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'Pedido/patchActualizarDetallePedido', detalle, { headers });
    }

    deleteEliminarDetallePedido(detalle: EliminarDetallePedidoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.request('delete', this.baseUrl + 'Pedido/deleteEliminarDetallePedido', { headers, body: detalle });
    }

    postRegistrarCentroCostoPedidoRegistrado(centroCosto: RegistrarCentroCostoPedidoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'Pedido/postRegistrarCentroCostoPedidoRegistrado', centroCosto, { headers });
    }

    deleteEliminarCentroCostoPedidoRegistrado(centroCosto: EliminarCentroCostoPedidoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.request('delete', this.baseUrl + 'Pedido/deleteEliminarCentroCostoPedidoRegistrado', { headers, body: centroCosto });
    }

    registrarProveedor(proveedor: RegistrarProveedorRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'Proveedor/postRegistrarProveedor', proveedor, { headers });
    }

    actualizarProveedor(proveedor: ActualizarProveedorRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'Proveedor/patchActualizarProveedor', proveedor, { headers });
    }

    getListarProveedorBanco(filtros: ProveedorBancoFiltro = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        if (filtros.Prv_Ban_Id !== undefined) {
            params = params.append('Prv_Ban_Id', filtros.Prv_Ban_Id);
        }

        if (filtros.Prv_Id !== undefined) {
            params = params.append('Prv_Id', filtros.Prv_Id);
        }

        return this.http.get(this.baseUrl + 'Proveedor/getListarProveedorBanco', { headers, params });
    }

    registrarProveedorBanco(proveedorBanco: RegistrarProveedorBancoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'Proveedor/postRegistrarProveedorBanco', proveedorBanco, { headers });
    }

    actualizarProveedorBanco(proveedorBanco: ActualizarProveedorBancoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'Proveedor/patchActualizarProveedorBanco', proveedorBanco, { headers });
    }

    eliminarProveedorBanco(proveedorBanco: EliminarProveedorBancoRequest): Observable<any> {
        const headers = this.Header;
        return this.http.delete(this.baseUrl + 'Proveedor/deleteEliminarProveedorBanco', { headers, body: proveedorBanco });
    }

    actualizarCuentaBancariaProveedor(proveedorBanco: ActualizarCuentaBancariaProveedorRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'Proveedor/patchActualizarCuentaBancariaProveedor', proveedorBanco, { headers });
    }

    getLlenarDesplegable(Usr_Cod: string){
    const headers = this.Header;
    let params = new HttpParams();
    params = params.append('Usr_Cod', Usr_Cod);
    return this.http.get(this.baseUrl + 'LbColaTrabajo/getLlenarDesplegable', { headers, params })
    }

    // ─── Inspecciones ────────────────────────────────────────────────

    getListarInsClientes(): Observable<any> {
        const headers = this.Header;
        return this.http.get(this.baseUrl + 'Inspecciones/getListarClientes', { headers });
    }

    getSubEstacionesPorCliente(Cliente_Id: number): Observable<any> {
        const headers = this.Header;
        const params = new HttpParams().set('Cliente_Id', String(Cliente_Id));
        return this.http.get(this.baseUrl + 'Inspecciones/getSubEstacionesPorCliente', { headers, params });
    }

    getListarMotivos(): Observable<any> {
        const headers = this.Header;
        return this.http.get(this.baseUrl + 'Inspecciones/getListarMotivos', { headers });
    }

    getListarClimas(): Observable<any> {
        const headers = this.Header;
        return this.http.get(this.baseUrl + 'Inspecciones/getListarClimas', { headers });
    }

    getListarTareas(): Observable<any> {
        const headers = this.Header;
        return this.http.get(this.baseUrl + 'Inspecciones/getListarTareas', { headers });
    }

    getListarSubContratas(): Observable<any> {
        const headers = this.Header;
        return this.http.get(this.baseUrl + 'Inspecciones/getListarSubContratas', { headers });
    }

    registrarObservacionPlaneada(observacion: RegistrarObservacionPlaneadaRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'Inspecciones/postRegistrarObservacionPlaneada', observacion, { headers });
    }

    getListarJefesArea(): Observable<any> {
        const headers = this.Header;
        return this.http.get(this.baseUrl + 'Inspecciones/getListarJefesArea', { headers });
    }

    getConsultarEstadoObservaciones(Estado: 'A' | 'I'): Observable<any> {
        const headers = this.Header;
        const params = new HttpParams().set('Estado', Estado);
        return this.http.get(this.baseUrl + 'Inspecciones/getConsultarEstadoObservaciones', { headers, params });
    }

    getFiltrarObservaciones(Fecha_Desde: string, Fecha_Hasta: string, Estado: 'A' | 'I'): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams()
            .set('Fecha_Desde', Fecha_Desde)
            .set('Fecha_Hasta', Fecha_Hasta)
            .set('Estado', Estado);

        return this.http.get(this.baseUrl + 'Inspecciones/getFiltrarObservaciones', { headers, params });
    }

    getMostrarObservacionPlaneada(Codigo_Obs: string): Observable<any> {
        const headers = this.Header;
        const params = new HttpParams().set('Codigo_Obs', Codigo_Obs);
        return this.http.get(this.baseUrl + 'Inspecciones/getMostrarObservacionPlaneada', { headers, params });
    }

    actualizarObservacionPlaneada(observacion: ActualizarObservacionPlaneadaRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(
            this.baseUrl + 'Inspecciones/patchActualizarObservacionPlaneada',
            observacion,
            { headers }
        );
    }

    eliminarObservacionPlaneada(observacion: EliminarObservacionPlaneadaRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(
            this.baseUrl + 'Inspecciones/postEliminarObservacionPlaneada',
            observacion,
            { headers }
        );
    }


    // ─── Sub Estación ────────────────────────────────────────────────

    getListarSubEstaciones(filtros: { Id?: number; Nombre?: string; Cliente_Id?: number; Estado?: string } = {}): Observable<any> {
        const headers = this.Header;
        let params = new HttpParams();

        if (filtros.Id !== undefined && filtros.Id !== null) {
            params = params.set('Id', String(filtros.Id));
        }

        if (filtros.Nombre !== undefined && filtros.Nombre !== null) {
            params = params.set('Nombre', filtros.Nombre);
        }

        if (filtros.Cliente_Id !== undefined && filtros.Cliente_Id !== null) {
            params = params.set('Cliente_Id', String(filtros.Cliente_Id));
        }

        if (filtros.Estado !== undefined && filtros.Estado !== null) {
            params = params.set('Estado', filtros.Estado);
        }

        return this.http.get(this.baseUrl + 'Subestaciones/getListarSubEstaciones', { headers, params });
    }

    getListarSubEstacion(filtros: { Id?: number; Nombre?: string; Cliente_Id?: number; Estado?: string } = {}): Observable<any> {
        return this.getListarSubEstaciones(filtros);
    }

    registrarSubEstacion(subEstacion: {
        Subestacion_Nombre: string;
        Cliente_Id: number;
        Usr_Reg: string;
    }): Observable<any> {
        const headers = this.Header;
        return this.http.post(
            this.baseUrl + 'Subestaciones/postInsertarSubestaciones',
            subEstacion,
            { headers }
        );
    }

    getConsultarDatosSubEstacion(Id: number): Observable<any> {
        const headers = this.Header;
        const params = new HttpParams().set('Id', String(Id));
        return this.http.get(this.baseUrl + 'Inspecciones/getConsultarDatosSubEstacion', { headers, params });
    }

    getConsultarEditarSubEstaciones(Subestacion_Id: number): Observable<any> {
        const headers = this.Header;
        const params = new HttpParams().set('Subestacion_Id', String(Subestacion_Id));
        return this.http.get(this.baseUrl + 'Subestaciones/getConsultarEditarSubEstaciones', { headers, params });
    }

    patchEditarSubEstaciones(subEstacion: {
        Subestacion_Id: number;
        Subestacion_Nombre: string;
        Cliente_Id: number;
        Usr_Mod: string;
        Estado: 'A' | 'I';
    }): Observable<any> {
        const headers = this.Header;
        return this.http.patch(
            this.baseUrl + 'Subestaciones/patchEditarSubEstaciones',
            subEstacion,
            { headers }
        );
    }

    actualizarSubEstacion(subEstacion: { Id: number; Nombre: string; Estado: string; Usr_Mod: string }): Observable<any> {
        const headers = this.Header;
        return this.http.patch(
            this.baseUrl + 'Inspecciones/patchActualizarSubEstacion',
            subEstacion,
            { headers }
        );
    }

    eliminarSubEstacion(Id: number, Usr_Mod: string): Observable<any> {
        const headers = this.Header;
        return this.http.post(
            this.baseUrl + 'Inspecciones/postEliminarSubEstacion',
            { Id, Usr_Mod },
            { headers }
        );
    }

}
