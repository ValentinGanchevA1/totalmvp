import { IsEmail, IsString, MinLength, IsOptional, IsPhoneNumber, ValidateIf, registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Custom validator to ensure at least one of email or phone is provided
export function IsEmailOrPhone(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isEmailOrPhone',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const obj = args.object as any;
          return !!(obj.email || obj.phone);
        },
        defaultMessage(args: ValidationArguments) {
          return 'Either email or phone must be provided';
        },
      },
    });
  };
}

export class RegisterDto {
  @ApiPropertyOptional({ example: 'user@example.com', description: 'Email address (required if phone is not provided)' })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsEmailOrPhone({ message: 'Either email or phone must be provided' })
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Phone number (required if email is not provided)' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'password123', minLength: 8, description: 'User password (minimum 8 characters)' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({ example: 'John Doe', description: 'Display name (minimum 2 characters)' })
  @IsString({ message: 'Display name must be a string' })
  @MinLength(2, { message: 'Display name must be at least 2 characters long' })
  displayName: string;
}

export class LoginDto {
  @ApiPropertyOptional({ example: 'user@example.com', description: 'Email address (required if phone is not provided)' })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsEmailOrPhone({ message: 'Either email or phone must be provided' })
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Phone number (required if email is not provided)' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'password123', description: 'User password' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(1, { message: 'Password is required' })
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  user: {
    id: string;
    email?: string;
    phone?: string;
    displayName: string;
    avatarUrl?: string;
  };
}
