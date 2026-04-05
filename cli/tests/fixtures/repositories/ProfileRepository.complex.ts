// @ts-nocheck — fixture file, parsed by ts-morph only
import { GET, POST, PATCH, DELETE, Param, Query, Body, BaseURL, Cache } from '@spry-cli/decorators'

@BaseURL('/api/v1')
export abstract class ProfileRepository {

  @GET('/profile/:userId')
  @Cache(60)
  abstract getProfile(@Param('userId') userId: string): Promise<UserProfile>

  @POST('/profile')
  abstract createProfile(@Body() input: CreateProfileInput): Promise<UserProfile>

  @PATCH('/profile/:userId')
  abstract updateProfile(
    @Param('userId') userId: string,
    @Body() input: UpdateProfileInput
  ): Promise<UserProfile>

  @DELETE('/profile/:userId')
  abstract deleteProfile(@Param('userId') userId: string): Promise<void>
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
