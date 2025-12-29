import { IsArray, IsInt, IsNotEmpty } from 'class-validator';

export class ReorderTrainingPlanItemsDto {
    @IsArray()
    @IsNotEmpty()
    @IsInt({ each: true })
    item_ids: number[];
}
