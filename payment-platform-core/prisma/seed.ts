import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { generateUuidV7 } from '@shared/ids/generate-uuid-v7';
import { credentialEncryptionService } from '@shared/crypto/credential-encryption';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Database...');

  // 1. Clean Database
  await prisma.settlementItem.deleteMany({});
  await prisma.settlement.deleteMany({});
  await prisma.apiKeyUsage.deleteMany({});
  await prisma.apiKey.deleteMany({});
  await prisma.webhookDelivery.deleteMany({});
  await prisma.outboxEvent.deleteMany({});
  await prisma.idempotencyKey.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.refund.deleteMany({});
  await prisma.void.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.paymentAttempt.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.merchantUser.deleteMany({});
  await prisma.merchantGatewayConfiguration.deleteMany({});
  await prisma.gatewayProvider.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.merchant.deleteMany({});

  // 2. Roles & Permissions
  const adminRoleId = generateUuidV7();
  const merchantRoleId = generateUuidV7();

  await prisma.role.createMany({
    data: [
      { id: adminRoleId, name: 'ADMIN', description: 'Platform Administrator' },
      { id: merchantRoleId, name: 'MERCHANT', description: 'Merchant User' }
    ]
  });

  const permissions = [
    { id: generateUuidV7(), name: 'PAYMENT_WRITE', description: 'Process payments' },
    { id: generateUuidV7(), name: 'PAYMENT_READ', description: 'Read payments' },
    { id: generateUuidV7(), name: 'GATEWAY_MANAGE', description: 'Configure gateway settings' }
  ];

  await prisma.permission.createMany({ data: permissions });

  // Link permissions to roles
  for (const perm of permissions) {
    await prisma.rolePermission.create({
      data: {
        roleId: merchantRoleId,
        permissionId: perm.id
      }
    });
  }

  // 3. Create Gateway Providers
  const stripeProviderId = generateUuidV7();
  const authNetProviderId = generateUuidV7();
  const nmiProviderId = generateUuidV7();
  const cardpointeProviderId = generateUuidV7();

  await prisma.gatewayProvider.createMany({
    data: [
      { id: stripeProviderId, code: 'STRIPE', name: 'Stripe' },
      { id: authNetProviderId, code: 'AUTHORIZE_NET', name: 'Authorize.Net' },
      { id: nmiProviderId, code: 'NMI', name: 'Network Merchants Inc' },
      { id: cardpointeProviderId, code: 'CARDPOINTE', name: 'Cardpointe REST' }
    ]
  });

  // 4. Create Merchants
  const merchantAId = generateUuidV7();
  const merchantBId = generateUuidV7();

  await prisma.merchant.createMany({
    data: [
      { id: merchantAId, name: 'Demo Merchant A', status: 'ACTIVE' },
      { id: merchantBId, name: 'Demo Merchant B', status: 'ACTIVE' }
    ]
  });

  // 5. Merchant Gateway Configurations (AES-256 Encrypted Credentials)
  const stripeCreds = credentialEncryptionService.encrypt(
    JSON.stringify({ apiKey: 'sk_test_mock', environment: 'SANDBOX' })
  );
  const authNetCreds = credentialEncryptionService.encrypt(
    JSON.stringify({ loginId: 'mock_login_id', transactionKey: 'mock_trans_key', environment: 'SANDBOX' })
  );
  const nmiCreds = credentialEncryptionService.encrypt(
    JSON.stringify({ username: 'demo', password: 'password', environment: 'SANDBOX' })
  );
  const cardpointeCreds = credentialEncryptionService.encrypt(
    JSON.stringify({
      merchantid: '406760782744',
      cardpointeuser: 'ftsusername',
      cardpointepass: 'ftspassword',
      siteName: 'fts',
      environment: 'SANDBOX'
    })
  );

  // Gateway config IDs stored for FK reference in demo payment below
  const gatewayConfigAStripeId = generateUuidV7();

  await prisma.merchantGatewayConfiguration.createMany({
    data: [
      // Merchant A
      {
        id: gatewayConfigAStripeId,
        merchantId: merchantAId,
        gatewayProviderId: stripeProviderId,
        displayName: 'Stripe Primary Sandbox',
        encryptedCredentials: stripeCreds,
        priority: 1,
        isDefault: true,
        environment: 'SANDBOX'
      },
      {
        id: generateUuidV7(),
        merchantId: merchantAId,
        gatewayProviderId: authNetProviderId,
        displayName: 'Authorize.Net Failover',
        encryptedCredentials: authNetCreds,
        priority: 2,
        isDefault: false,
        environment: 'SANDBOX'
      },
      {
        id: generateUuidV7(),
        merchantId: merchantAId,
        gatewayProviderId: nmiProviderId,
        displayName: 'NMI Tertiary Failover',
        encryptedCredentials: nmiCreds,
        priority: 3,
        isDefault: false,
        environment: 'SANDBOX'
      },
      // Merchant B
      {
        id: generateUuidV7(),
        merchantId: merchantBId,
        gatewayProviderId: stripeProviderId,
        displayName: 'Stripe Sandbox',
        encryptedCredentials: stripeCreds,
        priority: 1,
        isDefault: true,
        environment: 'SANDBOX'
      },
      {
        id: generateUuidV7(),
        merchantId: merchantBId,
        gatewayProviderId: cardpointeProviderId,
        displayName: 'Cardpointe Gateway',
        encryptedCredentials: cardpointeCreds,
        priority: 2,
        isDefault: false,
        environment: 'SANDBOX'
      }
    ]
  });

  // 6. Create Users
  const passwordHash = await bcrypt.hash('Password@123', 10);
  const adminUserId = generateUuidV7();
  const merchantUserIdA = generateUuidV7();
  const merchantUserIdB = generateUuidV7();

  await prisma.user.createMany({
    data: [
      { id: adminUserId, email: 'admin@paymentplatform.com', password: passwordHash, name: 'Platform Admin', roleId: adminRoleId },
      { id: merchantUserIdA, email: 'merchant.a@paymentplatform.com', password: passwordHash, name: 'Alice Merchant', roleId: merchantRoleId },
      { id: merchantUserIdB, email: 'merchant.b@paymentplatform.com', password: passwordHash, name: 'Bob Merchant', roleId: merchantRoleId }
    ]
  });

  await prisma.merchantUser.createMany({
    data: [
      { id: generateUuidV7(), merchantId: merchantAId, userId: merchantUserIdA },
      { id: generateUuidV7(), merchantId: merchantBId, userId: merchantUserIdB }
    ]
  });

  // 7. Customers
  const customerIdA = generateUuidV7();
  const customerIdB = generateUuidV7();

  await prisma.customer.createMany({
    data: [
      { id: customerIdA, merchantId: merchantAId, email: 'john.doe@gmail.com', firstName: 'John', lastName: 'Doe', phone: '+1234567890' },
      { id: customerIdB, merchantId: merchantBId, email: 'jane.smith@yahoo.com', firstName: 'Jane', lastName: 'Smith', phone: '+9876543210' }
    ]
  });

  // 8. API Keys
  // Plain key for merchant A: sk_test_demo_key_123456789
  const keyPlainA = 'sk_test_demo_key_123456789';
  const hashedKeyA = createHash('sha256').update(keyPlainA).digest('hex');

  // Plain key for merchant B: sk_test_demo_key_987654321
  const keyPlainB = 'sk_test_demo_key_987654321';
  const hashedKeyB = createHash('sha256').update(keyPlainB).digest('hex');

  await prisma.apiKey.createMany({
    data: [
      {
        id: generateUuidV7(),
        merchantId: merchantAId,
        hashedKey: hashedKeyA,
        prefix: 'sk_test_demo_key',
        name: 'Default Development Key A',
        isActive: true
      },
      {
        id: generateUuidV7(),
        merchantId: merchantBId,
        hashedKey: hashedKeyB,
        prefix: 'sk_test_demo_key',
        name: 'Default Development Key B',
        isActive: true
      }
    ]
  });

  // 9. Demo Transactions & Invoices
  const paymentId = generateUuidV7();
  await prisma.payment.create({
    data: {
      id: paymentId,
      merchantId: merchantAId,
      customerId: customerIdA,
      gatewayConfigId: gatewayConfigAStripeId,
      amount: 150.00,
      currency: 'USD',
      status: 'CAPTURED',
      cardBrand: 'VISA',
      cardLastFour: '4242',
      cardExpiry: '12/2028',
      gatewayToken: 'pi_mock_123456',
      paymentMethodType: 'credit_card',
      customerSnapshot: {
        email: 'john.doe@gmail.com',
        phone: '+1234567890',
        billingAddress: null,
        shippingAddress: null
      },
      paymentDetails: {
        cardholderName: 'John Doe',
        cardLastFour: '4242',
        cardBrand: 'VISA',
        expMonth: '12',
        expYear: '2028'
      }
    }
  });

  await prisma.paymentAttempt.create({
    data: {
      id: generateUuidV7(),
      paymentId,
      gatewayConfigId: gatewayConfigAStripeId,
      action: 'SALE',
      amount: 150.00,
      status: 'SUCCESS',
      gatewayTxnId: 'pi_mock_123456',
      responseCode: '200',
      responseMessage: 'succeeded',
      rawResponse: '{"id": "pi_mock_123456", "status": "succeeded"}'
    }
  });

  await prisma.transaction.create({
    data: {
      id: generateUuidV7(),
      paymentId,
      amount: 150.00,
      type: 'CREDIT',
      status: 'SETTLED'
    }
  });

  await prisma.invoice.create({
    data: {
      id: generateUuidV7(),
      merchantId: merchantAId,
      paymentId,
      number: 'INV-2026-0001',
      pdfUrl: 'https://paymentplatform-invoices.s3.amazonaws.com/INV-2026-0001.pdf',
      status: 'PAID'
    }
  });

  console.log('Seeding completed successfully!');
  console.log(`Merchant A API Key: ${keyPlainA}`);
  console.log(`Merchant B API Key: ${keyPlainB}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
