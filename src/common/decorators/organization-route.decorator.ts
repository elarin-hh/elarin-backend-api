import { SetMetadata } from '@nestjs/common';

export const IS_ORGANIZATION_ROUTE_KEY = 'isOrganizationRoute';
export const OrganizationRoute = () => SetMetadata(IS_ORGANIZATION_ROUTE_KEY, true);
