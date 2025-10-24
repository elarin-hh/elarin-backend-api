import { IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkUserDto {
  @ApiProperty({ example: 1, description: 'User ID to link to gym' })
  @IsNumber()
  @IsNotEmpty()
  user_id: number;

  @ApiProperty({ example: 1, description: 'Gym ID to link user to' })
  @IsNumber()
  @IsNotEmpty()
  gym_id: number;
}
