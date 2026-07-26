export interface SignatureProviderRequest {
  tenantId: string;
  requestId: string;
  submissionId: string;
}

export interface SignatureProviderResult {
  externalReference: string;
  status: 'processing' | 'completed';
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface SignatureProviderPort {
  readonly providerKey: string;
  createRequest(
    request: SignatureProviderRequest,
  ): Promise<SignatureProviderResult>;
}
