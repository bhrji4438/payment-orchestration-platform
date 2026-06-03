import { AbstractPaymentGateway } from '@shared/contracts/abstract-payment-gateway';
import { StripeGatewayAdapter } from '../stripe/stripe-gateway.adapter';
import { AuthorizeNetGatewayAdapter } from '../authorize-net/authorize-net-gateway.adapter';
import { NmiGatewayAdapter } from '../nmi/nmi-gateway.adapter';
import { CardpointeGatewayAdapter } from '../cardpointe/cardpointe-gateway.adapter';
import { credentialEncryptionService } from '@shared/crypto/credential-encryption';
import { prisma } from '../../../infrastructure/database/prisma';

export class GatewayFactory {
  private gatewayClassMap: Map<string, any> = new Map();

  constructor() {
    this.gatewayClassMap.set('STRIPE', StripeGatewayAdapter);
    this.gatewayClassMap.set('AUTHORIZE_NET', AuthorizeNetGatewayAdapter);
    this.gatewayClassMap.set('NMI', NmiGatewayAdapter);
    this.gatewayClassMap.set('CARDPOINTE', CardpointeGatewayAdapter);
    this.gatewayClassMap.set('CUSTOM', CardpointeGatewayAdapter);
  }

  public async create(
    merchantId: string,
    gatewayConfigurationId?: string
  ): Promise<AbstractPaymentGateway> {
    let config;

    if (gatewayConfigurationId) {
      config = await prisma.merchantGatewayConfiguration.findFirst({
        where: {
          id: gatewayConfigurationId,
          merchantId,
          isActive: true,
          deletedAt: null
        },
        include: { gatewayProvider: true }
      });
    } else {
      config = await prisma.merchantGatewayConfiguration.findFirst({
        where: {
          merchantId,
          isDefault: true,
          isActive: true,
          deletedAt: null
        },
        include: { gatewayProvider: true }
      });
    }

    if (!config) {
      throw new Error(`Active gateway configuration not found for Merchant ${merchantId}`);
    }

    const providerCode = config.gatewayProvider.code.toUpperCase();
    const GatewayClass = this.gatewayClassMap.get(providerCode);

    if (!GatewayClass) {
      throw new Error(`Unsupported Gateway Provider Code: ${providerCode}`);
    }

    const decryptedCredentials = JSON.parse(
      credentialEncryptionService.decrypt(config.encryptedCredentials)
    );

    return new GatewayClass(
      {
        ...decryptedCredentials,
        gatewayConfigurationId: config.id
      },
      config.environment,
      merchantId
    );
  }

  public getAdapter(gatewayCode: string): AbstractPaymentGateway {
    const providerCode = gatewayCode.toUpperCase();
    const GatewayClass = this.gatewayClassMap.get(providerCode);

    if (!GatewayClass) {
      throw new Error(`Unsupported Gateway Provider Code: ${providerCode}`);
    }

    return new GatewayClass({}, 'sandbox', 'system');
  }
}

export const gatewayFactory = new GatewayFactory();
export default gatewayFactory;
