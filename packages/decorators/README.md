# @spry/decorators

TypeScript decorators for defining [Spry](https://github.com/MerseniBilel/spry) repository contracts. Annotate an abstract class with HTTP verbs and parameter bindings, then let the Spry CLI generate your entire data layer, use cases, and state management.

## Install

```bash
npm install @spry/decorators
```

## Usage

```ts
import {
  BaseURL,
  GET,
  POST,
  PATCH,
  DELETE,
  Param,
  Query,
  Body,
  Cache,
  Paginated,
} from '@spry/decorators'

@BaseURL('/api/v1')
export abstract class ProfileRepository {
  @GET('/profile/:userId')
  @Cache(60)
  abstract getProfile(@Param('userId') userId: string): Promise<UserProfile>

  @GET('/profiles')
  @Paginated()
  abstract getProfiles(@Query('page') page: number): Promise<PaginatedResult<UserProfile>>

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
```

Then run:

```bash
spry build profile
```

Spry reads these decorators statically via the TypeScript AST — no runtime reflection or `reflect-metadata` required.

## API Reference

### Class Decorator

| Decorator | Description |
|-----------|-------------|
| `@BaseURL(url)` | Base path prepended to all method paths |

### Method Decorators (HTTP Verbs)

| Decorator | Description |
|-----------|-------------|
| `@GET(path)` | HTTP GET request |
| `@POST(path)` | HTTP POST request |
| `@PATCH(path)` | HTTP PATCH request |
| `@PUT(path)` | HTTP PUT request |
| `@DELETE(path)` | HTTP DELETE request |

### Method Decorators (Extras)

| Decorator | Description |
|-----------|-------------|
| `@Cache(seconds)` | Sets `staleTime` in generated React Query hooks |
| `@Paginated()` | Generates `useInfiniteQuery` instead of `useQuery` |

### Parameter Decorators

| Decorator | Description |
|-----------|-------------|
| `@Param(name)` | Path parameter (e.g., `:userId`) |
| `@Query(name)` | Query string parameter (e.g., `?page=1`) |
| `@Body()` | Request body |
| `@Header(name)` | Request header |

## How It Works

These decorators are intentionally no-op at runtime — they simply return the original descriptor/target unchanged. The Spry CLI uses [ts-morph](https://ts-morph.com/) to read decorator metadata directly from the AST at build time, so there is zero runtime overhead.

## License

MIT
