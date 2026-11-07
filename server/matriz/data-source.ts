import type { AbsRow, CargaData, Params, RiscoRow } from '../../shared/types';

/**
 * Contrato da fonte de dados. A Fase 1 usa GoogleSheetDataSource.
 * A Fase 2 cria SqlServerDataSource com a mesma interface; o cálculo, a API e a tela não mudam.
 * Cada método devolve objetos tipados, nunca texto CSV.
 */
export interface MatrizDataSource {
  readonly nome: string;
  lerAbsoluto(): Promise<AbsRow[]>;
  lerRisco(): Promise<RiscoRow[]>;
  lerCarga(): Promise<CargaData>;
  lerParametros(): Promise<Params>;
}

export const MATRIZ_DATA_SOURCE = Symbol('MATRIZ_DATA_SOURCE');
