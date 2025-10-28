import { IsEmail, IsString, MinLength, IsDateString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
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
}
