import { SetMetadata } from '@nestjs/common';

export const IS_GYM_ROUTE_KEY = 'isGymRoute';
export const GymRoute = () => SetMetadata(IS_GYM_ROUTE_KEY, true);
