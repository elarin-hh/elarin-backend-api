import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentGym = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const gym = request.gym;

    return data ? gym?.[data] : gym;
  },
);
