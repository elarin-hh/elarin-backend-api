import { IsEmail, IsString, MinLength, IsNumber, IsDateString, IsOptional, IsBoolean, Min, Max } from 'class-validator';

export class RegisterWithOrganizationDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres' })
  password: string;

  @IsString()
  @MinLength(2, { message: 'O nome completo deve ter pelo menos 2 caracteres' })
  full_name: string;

  @IsDateString()
  birth_date: string;

  @IsNumber()
  organization_id: number;



  @IsBoolean()
  @IsOptional()
  marketing_consent?: boolean;

  @IsNumber()
  @Min(50, { message: 'Altura deve ser no mínimo 50cm' })
  @Max(300, { message: 'Altura deve ser no máximo 300cm' })
  height_cm: number;

  @IsNumber()
  @Min(20, { message: 'Peso deve ser no mínimo 20kg' })
  @Max(500, { message: 'Peso deve ser no máximo 500kg' })
  weight_kg: number;
}
