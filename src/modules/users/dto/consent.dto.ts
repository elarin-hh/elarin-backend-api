import { IsBoolean, IsDateString, IsEnum, IsOptional } from 'class-validator';

export enum ConsentType {
  GENERAL = 'general',
  BIOMETRIC = 'biometric',
  MARKETING = 'marketing',
}

export class UpdateConsentDto {
  @IsEnum(ConsentType)
  consent_type: ConsentType;

  @IsBoolean()
  consent_given: boolean;

  @IsDateString()
  @IsOptional()
  consent_timestamp?: string;
}
