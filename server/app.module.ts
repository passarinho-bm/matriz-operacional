import { Module } from '@nestjs/common';
import { MATRIZ_DATA_SOURCE } from './matriz/data-source';
import { GoogleSheetDataSource } from './matriz/google-sheet.data-source';
import { MatrizController } from './matriz/matriz.controller';
import { MatrizService } from './matriz/matriz.service';

@Module({
  controllers: [MatrizController],
  providers: [
    MatrizService,
    // Fase 2: trocar por SqlServerDataSource. Nada mais muda.
    { provide: MATRIZ_DATA_SOURCE, useClass: GoogleSheetDataSource },
  ],
})
export class AppModule {}
