// @ts-nocheck — fixture file, parsed by ts-morph only
import { GET, Param, Query, BaseURL, Paginated } from '@spry-cli/decorators'

@BaseURL('/api/v1')
export abstract class ProfileRepository {

  @GET('/profile/:userId')
  abstract getProfile(@Param('userId') userId: string): Promise<UserProfile>

  @GET('/profiles')
  @Paginated()
  abstract getProfiles(@Query('page') page: number): Promise<PaginatedResult>
}

interface UserProfile {
  id: string
  name: string
}

interface PaginatedResult {
  items: UserProfile[]
  total: number
}
