import { IsEmail, IsString, MinLength, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class RegisterOrganizationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsNotEmpty()
  federal_tax_id: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  responsible_name: string;

  @IsNumber()
  @IsNotEmpty()
  plan_id: number;
}
