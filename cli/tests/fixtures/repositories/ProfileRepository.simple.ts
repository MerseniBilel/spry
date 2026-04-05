// @ts-nocheck — fixture file, parsed by ts-morph only
import { GET, PATCH, Param, Body, BaseURL, Cache } from '@spry-cli/decorators'

@BaseURL('/api/v1')
export abstract class ProfileRepository {

  @GET('/profile/:userId')
  @Cache(60)
  abstract getProfile(@Param('userId') userId: string): Promise<UserProfile>

  @PATCH('/profile/:userId')
  abstract updateProfile(
    @Param('userId') userId: string,
    @Body() input: UpdateProfileInput
  ): Promise<UserProfile>
}

interface UserProfile {
  id: string
  name: string
}

interface UpdateProfileInput {
  name: string
}
