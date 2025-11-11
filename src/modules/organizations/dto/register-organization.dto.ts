import { IsEmail, IsString, MinLength, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterOrganizationDto {
  @ApiProperty({ example: 'Empresa XYZ Ltda' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'empresa_xyz_ltda', required: false, description: 'Auto-generated if not provided' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({ example: '12.345.678/0001-90' })
  @IsString()
  @IsNotEmpty()
  federal_tax_id: string;

  @ApiProperty({ example: 'contato@empresaxyz.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senha123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: '(11) 98765-4321' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Rua das Flores, 123 - São Paulo, SP' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @IsNotEmpty()
  responsible_name: string;

  @ApiProperty({ example: 1, description: 'Plan ID' })
  @IsNumber()
  @IsNotEmpty()
  plan_id: number;
}
