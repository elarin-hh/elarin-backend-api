import { IsArray, IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderTrainingPlanItemsDto {
    @ApiProperty({
        description: 'Array of item IDs in the desired order',
        type: [Number],
    })
    @IsArray()
    @IsNotEmpty()
    @IsInt({ each: true })
    item_ids: number[];
}
