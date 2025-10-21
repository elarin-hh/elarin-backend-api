import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginGymDto {
  @ApiProperty({ example: 'contato@fitnessplus.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senha123' })
  @IsString()
  @MinLength(6)
  password: string;
}
