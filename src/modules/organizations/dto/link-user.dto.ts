import { IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkUserDto {
  @ApiProperty({ example: 1, description: 'User ID to link to organization' })
  @IsNumber()
  @IsNotEmpty()
  user_id: number;

  @ApiProperty({ example: 1, description: 'Organization ID to link user to' })
  @IsNumber()
  @IsNotEmpty()
  organization_id: number;
}
