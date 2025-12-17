import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsDateString } from 'class-validator';

export class CreateNotificationDto {
  @ApiPropertyOptional({
    description: 'Organization ID - if null, notification is shown to all organizations',
    example: 1,
    nullable: true,
  })
  @IsOptional()
  @IsNumber()
  organization_id?: number | null;

  @ApiProperty({
    description: 'Notification title',
    example: 'Nova funcionalidade disponível!',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Notification description',
    example: 'Agora você pode exportar relatórios em PDF.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Icon identifier',
    example: 'megaphone',
    default: 'megaphone',
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({
    description: 'Color theme',
    example: 'primary',
    default: 'primary',
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    description: 'Whether notification is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Expiration date (ISO 8601)',
    example: '2025-12-31T23:59:59Z',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  expires_at?: string | null;
}
