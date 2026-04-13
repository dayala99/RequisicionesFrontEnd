import { PaymentOption, ProviderRecord } from './provider-form.models';

export const PROVIDER_RECORDS: ProviderRecord[] = [
  {
    code: 1024,
    name: 'Comercial Santa Marta SAC',
    phone: '01-445-2001',
    address: 'Av. Javier Prado Este 1842, San Isidro',
    contact: 'Lucia Perez',
    ruc: '20123456789'
  },
  {
    code: 2048,
    name: 'Servicios Industriales Andinos SRL',
    phone: '01-612-8890',
    address: 'Calle Los Talleres 250, Ate',
    contact: 'Carlos Ramos',
    ruc: '20567891234'
  },
  {
    code: 3072,
    name: 'Distribuciones Pacasmayo EIRL',
    phone: '01-523-7711',
    address: 'Jr. Las Begonias 750, Surquillo',
    contact: 'Mariana Torres',
    ruc: '20678912345'
  }
];

export const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    code: 1,
    description: 'Contado'
  },
  {
    code: 2,
    description: 'Credito 15 dias'
  },
  {
    code: 3,
    description: 'Credito 30 dias'
  }
];
