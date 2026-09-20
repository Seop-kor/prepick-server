import { Query, Resolver } from '@nestjs/graphql';

import { CommonService } from './common.service';
import { Public } from '../auth/public.decorator';

@Resolver()
export class CommonResolver {
  constructor(private commonService: CommonService) {}

  @Query(() => Boolean)
  @Public()
  healthCheck(): boolean {
    const healthCheck = this.commonService.healthCheck();
    return healthCheck;
  }
}
