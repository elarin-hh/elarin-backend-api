import { IsBoolean, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ConsentType {
  GENERAL = 'general',
  BIOMETRIC = 'biometric',
  MARKETING = 'marketing',
}

export class UpdateConsentDto {
  @ApiProperty({
    enum: ConsentType,
    example: ConsentType.BIOMETRIC,
    description: 'Tipo de consentimento a ser atualizado'
  })
  @IsEnum(ConsentType)
  consent_type: ConsentType;

  @ApiProperty({
    example: true,
    description: 'true para dar consentimento, false para revogar'
  })
  @IsBoolean()
  consent_given: boolean;

  @ApiPropertyOptional({
    example: '2025-10-27T14:30:00Z',
    description: 'Timestamp do consentimento (opcional, gerado automaticamente se omitido)'
  })
  @IsDateString()
  @IsOptional()
  consent_timestamp?: string;
}
