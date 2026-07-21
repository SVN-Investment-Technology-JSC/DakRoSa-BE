import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
  const guard = new PermissionsGuard(reflector);

  afterEach(() => jest.clearAllMocks());

  it('allows the system administrator without explicit leaf permission', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['roles.delete']);
    const context = new ExecutionContextHost([
      { user: { roleCodes: ['admin'], permissions: [] } },
      {},
      jest.fn(),
    ]);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('requires every permission declared by the endpoint', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['users.view', 'users.update']);
    const context = new ExecutionContextHost([
      { user: { roleCodes: ['operator'], permissions: ['users.view'] } },
      {},
      jest.fn(),
    ]);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
