// src/modules/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    phone: '+1234567890',
    displayName: 'Test User',
    passwordHash: 'hashedPassword',
    isActive: true,
    isBanned: false,
    lastSeenAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return tokens when credentials are valid', async () => {
      const mockUserEntity = { ...mockUser, passwordHash: await bcrypt.hash('password', 10) };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUserEntity as User);
      jest.spyOn(jwtService, 'sign').mockReturnValue('mockToken');
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

      const result = await service.login({
        email: 'test@example.com',
        password: 'password',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.login({
        email: 'nonexistent@example.com',
        password: 'password',
      })).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const mockUserEntity = { ...mockUser, passwordHash: await bcrypt.hash('password', 10) };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUserEntity as User);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      await expect(service.login({
        email: 'test@example.com',
        password: 'wrongpassword',
      })).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens when refresh token is valid', async () => {
      const mockUserEntity = mockUser;
      jest.spyOn(jwtService, 'verify').mockReturnValue({ sub: 'user-1' });
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUserEntity as User);
      jest.spyOn(jwtService, 'sign').mockReturnValue('mockToken');

      const result = await service.refreshToken('validRefreshToken');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalidToken')).rejects.toThrow('Invalid refresh token');
    });
  });
});
