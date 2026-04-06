// @ts-nocheck — fixture file, parsed by ts-morph only
import { GET, POST, PATCH, DELETE, Param, Query, Body, BaseURL, Cache } from '@spry-cli/decorators'

@BaseURL('/api/v1')
export abstract class ProfileRepository {

  @GET('/profile/:userId')
  @Cache(60)
  getProfile(@Param('userId') userId: string): Promise<UserProfile> { throw new Error('contract') }

  @POST('/profile')
  createProfile(@Body() input: CreateProfileInput): Promise<UserProfile> { throw new Error('contract') }

  @PATCH('/profile/:userId')
  updateProfile(
    @Param('userId') userId: string,
    @Body() input: UpdateProfileInput
  ): Promise<UserProfile> { throw new Error('contract') }

  @DELETE('/profile/:userId')
  deleteProfile(@Param('userId') userId: string): Promise<void> { throw new Error('contract') }
}

interface UserProfile {
  id: string
  name: string
}

interface CreateProfileInput {
  name: string
}

interface UpdateProfileInput {
  name: string
}
