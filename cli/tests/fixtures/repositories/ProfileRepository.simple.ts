// @ts-nocheck — fixture file, parsed by ts-morph only
import { GET, PATCH, Param, Body, BaseURL, Cache } from '@spry-cli/decorators'

@BaseURL('/api/v1')
export abstract class ProfileRepository {

  @GET('/profile/:userId')
  @Cache(60)
  getProfile(@Param('userId') userId: string): Promise<UserProfile> { throw new Error('contract') }

  @PATCH('/profile/:userId')
  updateProfile(
    @Param('userId') userId: string,
    @Body() input: UpdateProfileInput
  ): Promise<UserProfile> { throw new Error('contract') }
}

interface UserProfile {
  id: string
  name: string
}

interface UpdateProfileInput {
  name: string
}
