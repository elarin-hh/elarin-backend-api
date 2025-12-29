import { IsNumber, IsNotEmpty } from 'class-validator';

export class LinkUserDto {
  @IsNumber()
  @IsNotEmpty()
  user_id: number;

  @IsNumber()
  @IsNotEmpty()
  organization_id: number;
}
