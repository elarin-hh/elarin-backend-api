import { IsEmail, IsString, MinLength, IsNumber, IsDateString, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterWithOrganizationDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6, description: 'User password' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({ example: 'John Doe', minLength: 2, description: 'User full name' })
  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters long' })
  full_name: string;

  @ApiProperty({
    example: '1995-05-15',
    description: 'Data de nascimento (idade mínima: 13 anos - LGPD Art. 14)'
  })
  @IsDateString()
  birth_date: string;

  @ApiProperty({ example: 1, description: 'Organization ID' })
  @IsNumber()
  organization_id: number;

  @ApiPropertyOptional({
    example: 'pt-BR',
    description: 'Idioma preferido do usuário'
  })
  @IsString()
  @IsOptional()
  locale?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Consentimento para comunicações de marketing (opcional)'
  })
  @IsBoolean()
  @IsOptional()
  marketing_consent?: boolean;

  @ApiPropertyOptional({
    example: 175,
    description: 'Altura do usuário em centímetros'
  })
  @IsNumber()
  @IsOptional()
  @Min(50, { message: 'Altura deve ser no mínimo 50cm' })
  @Max(300, { message: 'Altura deve ser no máximo 300cm' })
  height_cm?: number;

  @ApiPropertyOptional({
    example: 70.5,
    description: 'Peso do usuário em quilogramas'
  })
  @IsNumber()
  @IsOptional()
  @Min(20, { message: 'Peso deve ser no mínimo 20kg' })
  @Max(500, { message: 'Peso deve ser no máximo 500kg' })
  weight_kg?: number;
}
