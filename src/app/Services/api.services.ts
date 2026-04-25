import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GlobalVariable } from '../VarGlobals';
import { HttpHeaders } from '@angular/common/http';
import { HttpParams } from '@angular/common/http';

export interface UsuariosFiltro {
    Usr_Id?: number;
    Usr_Cod?: string;
    Usr_Nom?: string;
    Flg_Est?: string;
}

export interface ProveedoresFiltro {
    Prv_Id?: number;
    Prv_Nom?: string;
    Prv_Ruc?: string;
    Prv_Nom_Con?: string;
    Flg_Est?: string;
}

export interface ActualizarUsuarioRequest {
    Usr_Id: string;
    Usr_Cod: string;
    Usr_Nom: string;
    Flg_Est: string;
    Usr_Mod: string;
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
}

export interface RegistrarProveedorRequest {
    Prv_Nom: string;
    Prv_Ruc: string;
    Prv_Tel: string;
    Prv_Dir: string;
    Prv_Nom_Con: string;
    Usr_Reg: string;
}

export interface ActualizarProveedorRequest {
    Prv_Id: number;
    Prv_Nom: string;
    Prv_Ruc: string;
    Prv_Tel: string;
    Prv_Dir: string;
    Prv_Nom_Con: string;
    Flg_Est: string;
    Usr_Reg: string;
    Fec_Reg: string;
    Usr_Mod: string;
    Fec_Mod: string;
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

    registrarProveedor(proveedor: RegistrarProveedorRequest): Observable<any> {
        const headers = this.Header;
        return this.http.post(this.baseUrl + 'Proveedor/postRegistrarProveedor', proveedor, { headers });
    }

    actualizarProveedor(proveedor: ActualizarProveedorRequest): Observable<any> {
        const headers = this.Header;
        return this.http.patch(this.baseUrl + 'Proveedor/patchActualizarProveedor', proveedor, { headers });
    }

    getLlenarDesplegable(Usr_Cod: string){
    const headers = this.Header;
    let params = new HttpParams();
    params = params.append('Usr_Cod', Usr_Cod);
    return this.http.get(this.baseUrl + 'LbColaTrabajo/getLlenarDesplegable', { headers, params })
  }
}
