// @ts-nocheck — fixture file, parsed by ts-morph only
import { GET, Param, Query, BaseURL, Paginated } from '@spry-cli/decorators'

@BaseURL('/api/v1')
export abstract class ProfileRepository {

  @GET('/profile/:userId')
  getProfile(@Param('userId') userId: string): Promise<UserProfile> { throw new Error('contract') }

  @GET('/profiles')
  @Paginated()
  getProfiles(@Query('page') page: number): Promise<PaginatedResult> { throw new Error('contract') }
}

interface UserProfile {
  id: string
  name: string
}

interface PaginatedResult {
  items: UserProfile[]
  total: number
}
