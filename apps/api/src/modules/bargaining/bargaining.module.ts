import { Module } from '@nestjs/common';
import { BargainingService } from './bargaining.service';
import { BargainingController } from './bargaining.controller';

@Module({
  providers: [BargainingService],
  controllers: [BargainingController],
  exports: [BargainingService],
})
export class BargainingModule {}
